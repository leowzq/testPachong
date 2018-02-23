var https = require('https');
var cheerio = require('cheerio');
var agent = require('superagent');
var install = require('superagent-charset');
var fs = require('fs');
var async = require('async');
var request = require('request');

var options = process.argv.splice(2);
//获取要爬的url
var url = options[0]
//文本保存地址
var useText = options[1] ? options[1] : './save.txt'
//爬虫爬取
var paChongPlace = options[2] ? options[2] : 'div'
console.log("网站地址:", url)
console.log("储存地址:", options[1] ? options[1] : '默认当前文件夹下save.txt文件')
superagent = install(agent)
superagent.get(url).charset('utf-8').end(function (err, res) {
  if(err) {
    console.log("爬虫错误", err)
    return err
  }
  //输入网址的text元素
  let $ = cheerio.load(res.text);
  //找到网址要用的链接
  var pageSource = $('div .arcList a')
  async.mapSeries(pageSource, function(a, cb) {
    //拼接对应链接地址
    let getUrl = 'http://www.shui5.cn' + a.attribs.href
    //用链接生成保存地址
    let savePath = a.attribs.href.split('/').pop()
    superagent.get(getUrl).charset('gbk').end(function(err, result) {
      if(err) {
        cb(err)
        return
      }
      //链接内对应的text元素
      let $2 = cheerio.load(result.text);
      let detail = $2('.arcContent')
      //定义写入id
      let id = savePath.split('.html')[0]
      //定义写入内容
      var writeDetail = id
      //定义写入标题
      var title = $2('h1').text()
      writeDetail += '\r\n' + title + '\r\n' + '\r\n'
      //定义写入内容
      let pageDetail = $2('.arcContent td').html()
      //查询网页内容页数
      let pageLinkLenth = $2('.page_links a').text().length
      //定义拼接参数
      let pageDetails = ""
      if(pageDetail) {
        //内容转码
        pageDetail = unescape(pageDetail.replace(/\\u/g,"%u"));
        pageDetail = pageDetail.replace(/&#(x)?(\w+);/g,function($,$1,$2){
          return String.fromCharCode(parseInt($2,$1?16:10));
        });
      }
      //若当前页有分页
      //将页数裝成数据便于循环
      if(pageLinkLenth > 0) {
        let maxLinkLenth = (pageLinkLenth - 10) / 2 + 1
        var array = []
        for(var i = 2; i <= maxLinkLenth; i++) {
          array.push(i)
        }
        var item = {
          id: id, array: array, getUrl: getUrl,
          pageDetail: pageDetail, writeDetail: writeDetail, pageDetails: pageDetails
        }
        //写入所有链接拼接内容
        mapPageLink(item, function(err, result) {
          if(err) {
            cb(err)
            return
          }
          cb(null)
          return
        })
      } else {
        //当前页无分页则直接写入txt文件
        writeDetail += pageDetail
        writeFile('./law/' + id + '.txt', writeDetail, null, function(err, result) {
          if(err) {
            cb(err)
            return
          }
          cb(null)
          return
        })
      }
    })
  }, function(err, result) {
    if(err) {
      console.log("接收网页错误", err)
      return err
    }
  })
  console.log("页面模块:", paChongPlace)
  // var imgArr = []
  // $('img').each(function(index, imgs) {
  //   var imgSource = $(imgs).attr('src')
  //   div = $(imgs).attr('src') + '\n'
  //   imgArr.push(div)
  //   if(imgSource.split('/')[0] != 'http:' && imgSource.split('/')[0] != 'https:') {
  //     imgSource = 'http://www.bolue.cn/' + imgSource
  //   }
  //   request(imgSource).on('error', function(err) {
  //     console.log('图片下载失败:', err)
  //   }).pipe(fs.createWriteStream('./paChong/'+imgSource.split('/').pop()))
  // })
});

function writeFile(useText, pageSource, type, callback) {
  fs.writeFile(useText, pageSource, type, function(err) {
    if (err) {
      console.log("储存错误", err)
      callback(err);
    }
    console.log('保存成功');
    callback(null)
  })
}

function mapPageLink(item, callback) {
  let id = item.id
  let array = item.array
  let getUrl = item.getUrl
  let pageDetail = item.pageDetail
  let pageDetails = item.pageDetails
  let writeDetail = item.writeDetail
  //循环内容页
  async.mapSeries(array, function(num, cbt) {
    var urlArr = getUrl.split('/')
    urlArr.pop()
    var newUrl
    //拼接分页地址
    newUrl = urlArr.join('/') + '/' + id + '$' + num + '.html'
    console.log("NUM", newUrl)
    superagent.get(newUrl).charset('gbk').end(function(err, newRes) {
      if(err) {
        cbt(err)
        return
      }
      let $3 = cheerio.load(newRes.text);
      pageDetails = $3('.arcContent td').html()
      if(pageDetails) {
        pageDetails = unescape(pageDetails.replace(/\\u/g,"%u"));
        pageDetails = pageDetails.replace(/&#(x)?(\w+);/g,function($,$1,$2){
          return String.fromCharCode(parseInt($2,$1?16:10));
        });
      }
      cbt(null, pageDetails, newUrl)
      return
    })
  }, function(err, resulto, newUrl) {
    if(err) {
      callback(err)
      return
    }
    //将第一页内容和分页内容拼接
    var writeDetails = ''
    for(var i = 0; i < resulto.length; i++) {
      writeDetails += resulto[i]
    }
    writeDetail = writeDetail + pageDetail + writeDetails
    writeFile('./law/' + id + '.txt', writeDetail, null, function(err, result) {
      if(err) {
        callback(err)
        return
      }
      callback(null, true)
      return
    })
  })
}
