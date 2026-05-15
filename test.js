// 在 Electron 中，electron 模块是内置的
// 需要确保使用正确的 require 方式
const electron = require('electron')

console.log('electron:', electron)
console.log('electron type:', typeof electron)

// 如果 electron 是字符串（路径），说明模块解析有问题
if (typeof electron === 'string') {
  console.error('ERROR: electron module resolved to path instead of API')
  console.error('This is a known issue with pnpm and electron')
  process.exit(1)
}

const { app, BrowserWindow } = electron

app.whenReady().then(() => {
  console.log('App is ready!')
  app.quit()
})
