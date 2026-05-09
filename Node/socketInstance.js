// 避免循环引用
// 避免把 io 一层层函数参数传来传去
// 让路由 / 服务模块都能发 socket 消息
let _io = null;

module.exports = {
  setIO(io) {
    _io = io;
  },
  getIO() {
    return _io;
  },
};
