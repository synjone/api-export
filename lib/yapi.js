const http = require('request')
const fs = require('fs')
const path = require('path')

const mainTemplate = path.resolve(__dirname, '../conf/main_temp')
const ApiTemplate = fs.readFileSync(mainTemplate, 'utf8')

const nodeTemplate = path.resolve(__dirname, '../conf/node_temp')
const ApiFuncTemplate = fs.readFileSync(nodeTemplate, 'utf8')

class YApi {

	constructor(baseUrl) {
		this.baseUrl = baseUrl
		this.header = {
			"content-type": "application/json"
		}
		// 分组
		this.data = {
			group: null
		}
		this.outDir = '../out_files'

		
	}
	
	
	login (email,  password) {
		console.log('登录中...')
		let _this = this
		return new Promise((resolve, reject) => {
			const url = this.baseUrl + '/api/user/login'
			const ori = {
				email,
				password
			}
			http({
				url,
				method: 'POST',
				json: true,
				headers: _this.header,
				body: ori
			}, (err, res, body) => {
				if(err) {
					reject(err)
				}
				else if(res.statusCode !== 200) {
					reject(res)
				}
				else {
					console.log('登录成功')
					_this.header.Cookie = res.headers['set-cookie']
					resolve(body)
				}
			})
		})

		// http://yapi.campus.com/api/plugin/export?type=json&pid=11&status=all&isWiki=false
	}

	group () {
		console.log('获取分类')
		return new Promise((resolve, reject) => {
			const url = this.baseUrl + '/api/group/list'
			http.get({
				url,
				json: true,
				headers: this.header,
			}, (err, res, body) => {
				if(err) {
					reject(err)
				}
				else if(res.statusCode !== 200) {
					reject(res)
				}
				else {
					this.data.group = body.data
					resolve(body)
				}
			})
		})
	}

	projects (groupId)  {
		console.log('获取组' + groupId + '中的项目列表')
		return new Promise((resolve, reject) => {
			const url = this.baseUrl + '/api/project/list?group_id='+groupId+'&page=1&limit=30'
			http.get({
				url,
				json: true,
				headers: this.header,
			}, (err, res, body) => {
				if(err) {
					reject(err)
				}
				else if(res.statusCode !== 200) {
					reject(res)
				}
				else {
					let arr = this.data.group
					arr.forEach(item => {
						if (item._id === groupId) {
							item.projects = body.data.list
						}
					})
					console.log(this.data.group)
					resolve()
				}
			})
		})
	}

	download (projectId, projectName) {

		console.log('下载项目' + projectId + '中的api接口')
		return new Promise((resolve, reject) => {
			const url = this.baseUrl + '/api/plugin/export?type=json&pid='+projectId+'&status=all&isWiki=false'
			http.get({
				url,
				json: true,
				headers: this.header,
			}, (err, res, body) => {

				if(err) {
					reject(err)
				}
				else if(res.statusCode !== 200) {
					reject(res)
				}
				else {

					let m = ApiTemplate

					function loopRead(obj) {
						if(!obj.list) {
							
							let result = obj.path.match(/\{(.+?)\}/)
							if(result) {
								obj.path = obj.path.replace('/' + result[0], '')
							}
							let tempArr = obj.path.split('/')

							let funcName = obj.method.toLowerCase()

							for(let i = 0; i < tempArr.length; i++) {
								let item = tempArr[i]
								if(item) {
									funcName += item.charAt(0).toUpperCase() + item.slice(1)
								}
							}

							// 动态路由参数，默认支持id，默认只支持1级动态路由
							let title = obj.title
							if(obj.req_params.length) {
								title += '\n\t * @id ' + obj.req_params[0].desc
							}
							// 如果是动态路由，则参数中不能存在id
							if(obj.req_query.length) {
								obj.req_query.forEach(item => {
									title += '\n\t * @' + item.name + ' ' + item.desc
								})
							}

							

							let url = result ? `'${obj.path}/' + params.${result[1]}` : `'${obj.path}'`
							funcName = result ? funcName + 'Router' : funcName
							let params = result ? '{}' : 'params'
							let dataKey = obj.method == 'GET' ? 'params' : 'data'
							let str = ApiFuncTemplate.replace('{{funcName}}', funcName).replace('{{url}}', url).replace('{{method}}', obj.method).replace('{{params}}', params).replace('{{title}}', title).replace('{{dataKey}}', dataKey)
							m = m.replace('{{time}}', Date.now())
							m = m.replace('// ~~', str + '\n\t' + '// ~~')

						}else {
							let arr = obj.list
							arr.forEach(item => loopRead(item))
						}
					}

					loopRead({
						list: body
					})

					
					const dir = this.outDir + '/' + projectName
					fs.exists(dir, (exist) => {
						if(!exist) {
							fs.mkdirSync(dir)
							fs.writeFileSync(dir + '/api.js', m, (err) => { })
						}
						resolve(body)
					})
				}
			})
		})
	}

	delDir(p) {
		// 读取文件夹中所有文件及文件夹
		var list = fs.readdirSync(p)
		list.forEach((v, i) => {
			// 拼接路径
			var url = p + '/' + v
			// 读取文件信息
			var stats = fs.statSync(url)
			// 判断是文件还是文件夹
			if (stats.isFile()) {
			// 当前为文件，则删除文件
			fs.unlinkSync(url)
			} else {
				// 当前为文件夹，则递归调用自身
				this.delDir(url)
			}
		})
		// 删除空文件夹
		fs.rmdirSync(p)
	}

	reset() {
		let e = fs.existsSync(this.outDir)
		if(e) {
			this.delDir(this.outDir)
		}
		
		fs.mkdirSync(this.outDir)
	}
}
module.exports = YApi

