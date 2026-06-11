---
title: HydroOJ 极简开发指南
date: 2026/06/11 10:28:10
categories:
- 开发环境
tags:
- HydroOJ
- Docker
- OrbStack
---

使用 [OrbStack](https://orbstack.dev/) 或者 [WSL2](https://learn.microsoft.com/zh-cn/windows/wsl/) 创建 Linux 容器，这里使用 Debian 13 作为演示。

## 安装 HydroOJ

使用 HydroOJ 一键安装脚本安装。

```sh
$ LANG=zh . <(curl https://hydro.ac/setup.sh)
```

**注意**：使用 OrbStack 时，可能报 CPU 不支持 avx 指令集，可忽略。

安装成功后，停止自动启动的服务：

```sh
$ pm2 del hydrooj caddy
$ pm2 save
$ yarn global remove hydrooj # 注意不要在 Hydro 的目录里面
```

## 拉取源码

```sh
$ git clone https://github.com/hydro-dev/Hydro.git --recurse-submodules
$ cd Hydro
$ yarn
$ node build/prepare.js # 生成各个模块的 tsconfig.json，方便 IDE 识别
```

推荐使用 VSCode SSH 进容器进行开发。

## 启动开发服务

```sh
$ yarn debug --port=2333 --watch # 启动后端（监听端口 2333）
$ yarn build:ui:dev              # 启动前端
```

前端启动在 `http://localhost:8000`。
