<div align="center">

# 🎮 Number Bomb - 谁输谁洗碗

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-WeChat%20Mini%20Program-brightgreen.svg)](https://developers.weixin.qq.com/miniprogram/dev/framework/)
[![Stars](https://img.shields.io/github/stars/4682B4LEE/number-bomb-public?style=social)](https://github.com/4682B4LEE/number-bomb-public)

**[中文](#中文) | [English](#english)**

一款支持双人对战的猜谜游戏小程序，上线一个月累计注册用户超 3w+

</div>

---

<h2 id="中文">📖 中文文档</h2>

## 📋 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
  - [环境准备](#环境准备)
  - [项目配置](#项目配置)
  - [部署云函数](#部署云函数)
  - [创建数据库](#创建数据库)
- [项目结构](#项目结构)
- [游戏规则](#游戏规则)
  - [猜数字](#猜数字)
  - [猜颜色](#猜颜色)
- [更新日志](#更新日志)
- [技术支持](#技术支持)

## 项目简介

Number Bomb（谁输谁洗碗）是一款在微信小程序平台上运行的双人对战猜谜游戏。游戏包含多种模式，适合朋友聚会、情侣互动等场景。

### 游戏模式

| 模式 | 说明 | 特点 |
|------|------|------|
| 🎯 **本地双人** | 两名玩家在同一设备上轮流对战 | 无需网络，即开即玩 |
| 🌟 **每日挑战** | 每天一种固定模式，参与全服排名 | 6种模式轮换，每日限次 |
| 🧩 **残局解谜** | 500关单机闯关模式 | 根据线索推理正确答案 |
| ⚔️ **联机对战** | 实时匹配对战 | 支持猜数字和猜颜色 |

## 功能特性

- ✅ **多种游戏模式**：猜数字、猜颜色、每日挑战、残局解谜
- ✅ **实时联机对战**：基于微信云开发的实时匹配系统
- ✅ **排行榜系统**：全服排行、洗碗王排行、每日挑战排行
- ✅ **游戏记录**：云端保存对战记录，随时查看历史战绩
- ✅ **用户反馈**：内置反馈系统，持续优化游戏体验
- ✅ **音频系统**：Web Audio API 合成音效，无需外部文件
- ✅ **震动反馈**：支持手机震动，增强游戏沉浸感

## 技术栈

- **前端框架**: 微信小程序原生框架 (WXML + WXSS + JavaScript)
- **后端服务**: 微信云开发 (CloudBase)
- **数据库**: 云开发数据库 (MongoDB)
- **存储**: 云开发存储
- **实时通信**: 微信云开发实时数据推送

## 快速开始

### 环境准备

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 微信小程序账号（[注册](https://mp.weixin.qq.com)）
- 开通微信云开发环境

### 项目配置

#### 1. 配置 AppID

打开 `project.config.json` 文件，将 `YOUR_APPID_HERE` 替换为你的小程序 AppID：

```json
{
  "appid": "YOUR_APPID_HERE"
}
```

**获取 AppID：**
1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 复制"AppID(小程序ID)"

#### 2. 开通云开发

1. 在微信开发者工具中点击"云开发"按钮
2. 按照提示开通云开发环境
3. 记录你的云开发环境 ID

### 部署云函数

在云函数目录 `cloudfunctions/` 中，部署以下云函数：

| 云函数 | 功能说明 |
|--------|----------|
| `saveUser` | 保存用户信息到云数据库 |
| `saveRecord` | 保存游戏记录到云数据库 |
| `updateRecord` | 更新已有游戏记录 |
| `getRecords` | 获取用户的游戏记录列表 |
| `getRecordDetail` | 获取单条游戏记录详情 |
| `getDailyInfo` | 获取每日挑战信息 |
| `startDailyChallenge` | 开始每日挑战 |
| `submitDailyResult` | 提交每日挑战结果 |
| `getDailyRank` | 获取每日挑战排行榜 |
| `getGlobalRank` | 获取全服排行榜 |
| `getLoserRank` | 获取洗碗王排行榜 |
| `updateWinScore` | 更新获胜分数 |
| `updateLoseScore` | 更新失败分数 |
| `battleController` | 联机对战控制 |
| `cleanupRooms` | 清理过期房间 |
| `feedback_api` | 用户反馈接口 |

**部署方法：**
1. 在微信开发者工具中右键点击云函数文件夹
2. 选择"创建并部署：云端安装依赖"

### 创建数据库

在云开发控制台的数据库中，创建以下集合：

| 集合名 | 用途 | 权限设置 |
|--------|------|----------|
| `users` | 存储用户基本信息 | 用户可读，创建者可写 |
| `records` | 存储游戏对战记录 | 用户可读，创建者可写 |
| `daily_challenges` | 存储每日挑战数据 | 所有用户可读，所有用户可写 |
| `daily_rankings` | 存储每日挑战排行榜 | 所有用户可读，所有用户可写 |
| `global_rankings` | 存储全服排行榜 | 所有用户可读，所有用户可写 |
| `loser_rankings` | 存储洗碗王排行榜 | 所有用户可读，所有用户可写 |
| `rooms` | 存储联机对战房间 | 所有用户可读，所有用户可写 |
| `feedback` | 存储用户反馈 | 用户可读，创建者可写 |
| `puzzle_levels` | 存储残局关卡数据 | 所有用户可读，创建者可写 |
| `puzzle_progress` | 存储玩家闯关进度 | 用户可读，创建者可写 |

## 项目结构

```
number-bomb/
├── cloudfunctions/          # 云函数目录
│   ├── saveUser/           # 保存用户信息
│   ├── saveRecord/         # 保存游戏记录
│   ├── updateRecord/       # 更新游戏记录
│   ├── getRecords/         # 获取记录列表
│   ├── getRecordDetail/    # 获取记录详情
│   ├── getDailyInfo/       # 获取每日挑战信息
│   ├── startDailyChallenge/# 开始每日挑战
│   ├── submitDailyResult/  # 提交挑战结果
│   ├── getDailyRank/       # 获取每日排行榜
│   ├── getGlobalRank/      # 获取全服排行榜
│   ├── getLoserRank/       # 获取洗碗王榜
│   ├── updateWinScore/     # 更新获胜分数
│   ├── updateLoseScore/    # 更新失败分数
│   ├── battleController/   # 联机对战控制
│   ├── cleanupRooms/       # 清理过期房间
│   └── feedback_api/       # 用户反馈接口
├── pages/                   # 页面目录
│   ├── index/              # 首页
│   ├── ranking/            # 排行榜
│   ├── rules/              # 游戏规则
│   ├── names/              # 玩家设置
│   ├── coin/               # 抛硬币
│   ├── secret/             # 设置密码
│   ├── intermission/       # 中场休息
│   ├── game/               # 猜数字游戏
│   ├── result/             # 回合结果
│   ├── victory/            # 胜利结算
│   ├── color-mode/         # 颜色模式选择
│   ├── color-game/         # 猜颜色游戏
│   ├── color-result/       # 颜色回合结果
│   ├── color-victory/      # 颜色胜利界面
│   ├── color-gameover/     # 颜色游戏结束
│   ├── records/            # 历史战绩
│   ├── record-detail/      # 战绩详情
│   ├── feedback/           # 用户反馈
│   ├── daily-game/         # 每日挑战（数字）
│   ├── daily-color/        # 每日挑战（颜色）
│   ├── weekend/            # 周末活动
│   └── puzzle-game/        # 残局解谜
├── utils/                   # 工具函数
│   ├── audio.js            # 音频管理
│   ├── dailyChallenge.js   # 每日挑战工具
│   └── historyManager.js   # 历史记录管理
├── icons/                   # 图标资源
├── images/                  # 图片资源
├── app.js                   # 应用入口
├── app.json                 # 应用配置
├── app.wxss                 # 全局样式
├── project.config.json      # 项目配置
├── project.private.config.json # 私有配置
└── sitemap.json             # 站点地图
```

## 游戏规则

### 猜数字

#### 基本玩法
- **玩家人数**: 2人
- **游戏目标**: 猜中对方设置的4位数字密码

#### 游戏流程
1. **设置密码**: 每回合开始，当前玩家设置一个4位数字密码（每位数字0-9，可重复）
2. **轮流猜测**: 对方玩家在限定次数内（默认10次）猜测这个数字
3. **猜测提示**: 每次猜测后，系统会给出 A/B 提示：
   - **A (位置对)**: 数字正确且位置正确
   - **B (数字对)**: 数字正确但位置错误
4. **回合结束**: 猜中密码或次数用尽，回合结束，交换攻守
5. **比赛结束**: 一方先猜中对方密码即获胜

#### 示例
- 正确答案: `5 2 8 3`
- 玩家猜测: `5 3 7 2`
- 提示结果: **1A2B**
  - 1A: 数字5位置正确
  - 2B: 数字2和3存在但位置不对

### 猜颜色

#### 基本玩法
- **玩家人数**: 2人
- **游戏目标**: 猜中系统生成的4色颜色组合

#### 可用颜色
共有6种颜色可选：
- 🔴 红色
- 🟡 黄色
- 🔵 蓝色
- 🟢 绿色
- 🟣 紫色
- 🟠 橙色

#### 游戏模式
1. **简单模式**: 颜色可以重复（如：红红蓝绿）
2. **困难模式**: 颜色不可重复（4个位置颜色都不同）

#### 游戏流程
1. **系统生成密码**: 游戏开始时系统生成一个4色密码
2. **轮流猜测**: 双方玩家轮流猜测这个颜色组合
3. **猜测提示**: 每次猜测后，系统会给出 红/白 提示：
   - **🔴 红色**: 颜色正确且位置正确
   - **⚪ 白色**: 颜色正确但位置错误
4. **回合结束**: 猜中密码或次数用尽，游戏结束
5. **比赛结束**: 先猜中密码的玩家获胜

## 更新日志

### v1.0.0
- ✅ 完整的猜数字游戏
- ✅ 猜颜色游戏模式
- ✅ 每日挑战系统
- ✅ 残局解谜闯关
- ✅ 联机对战功能
- ✅ 排行榜系统
- ✅ 用户反馈系统
- ✅ 游戏记录云端保存

## 技术支持

如有问题或建议，欢迎联系！

- 微信号：SURFDUCK
- 小红书：4682B4

---

<h2 id="english">📖 English Documentation</h2>

## 📋 Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Configuration](#configuration)
  - [Deploy Cloud Functions](#deploy-cloud-functions)
  - [Create Database](#create-database)
- [Project Structure](#project-structure)
- [Game Rules](#game-rules)
  - [Number Guessing](#number-guessing)
  - [Color Guessing](#color-guessing)
- [Changelog](#changelog)
- [Support](#support)

## Introduction

Number Bomb (Who Loses Does the Dishes) is a two-player guessing game mini-program running on the WeChat platform. The game includes multiple modes, suitable for friends gatherings, couples interactions, and other scenarios.

### Game Modes

| Mode | Description | Features |
|------|-------------|----------|
| 🎯 **Local 2P** | Two players take turns on the same device | No network required, play instantly |
| 🌟 **Daily Challenge** | Fixed mode every day, global ranking | 6 modes rotation, limited attempts daily |
| 🧩 **Puzzle Mode** | 500 levels single-player mode | Deduce correct answer based on clues |
| ⚔️ **Online Battle** | Real-time matchmaking | Support number and color guessing |

## Features

- ✅ **Multiple Game Modes**: Number guessing, color guessing, daily challenge, puzzle solving
- ✅ **Real-time Online Battle**: Real-time matching system based on WeChat Cloud Development
- ✅ **Leaderboard System**: Global ranking, loser ranking, daily challenge ranking
- ✅ **Game Records**: Cloud save battle records, view history anytime
- ✅ **User Feedback**: Built-in feedback system, continuously optimizing game experience
- ✅ **Audio System**: Web Audio API synthesized sound effects, no external files needed
- ✅ **Vibration Feedback**: Support phone vibration, enhance game immersion

## Tech Stack

- **Frontend**: WeChat Mini Program Native Framework (WXML + WXSS + JavaScript)
- **Backend**: WeChat Cloud Development (CloudBase)
- **Database**: Cloud Development Database (MongoDB)
- **Storage**: Cloud Development Storage
- **Real-time Communication**: WeChat Cloud Development Real-time Data Push

## Quick Start

### Prerequisites

- [WeChat Developer Tools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- WeChat Mini Program Account ([Register](https://mp.weixin.qq.com))
- Enable WeChat Cloud Development Environment

### Configuration

#### 1. Configure AppID

Open `project.config.json` file, replace `YOUR_APPID_HERE` with your Mini Program AppID:

```json
{
  "appid": "YOUR_APPID_HERE"
}
```

**Get AppID:**
1. Login to [WeChat Official Platform](https://mp.weixin.qq.com)
2. Go to "Development" -> "Development Management" -> "Development Settings"
3. Copy "AppID (Mini Program ID)"

#### 2. Enable Cloud Development

1. Click the "Cloud Development" button in WeChat Developer Tools
2. Follow the prompts to enable cloud development environment
3. Record your cloud development environment ID

### Deploy Cloud Functions

In the cloud functions directory `cloudfunctions/`, deploy the following cloud functions:

| Cloud Function | Description |
|----------------|-------------|
| `saveUser` | Save user info to cloud database |
| `saveRecord` | Save game record to cloud database |
| `updateRecord` | Update existing game record |
| `getRecords` | Get user's game record list |
| `getRecordDetail` | Get single game record details |
| `getDailyInfo` | Get daily challenge info |
| `startDailyChallenge` | Start daily challenge |
| `submitDailyResult` | Submit daily challenge result |
| `getDailyRank` | Get daily challenge leaderboard |
| `getGlobalRank` | Get global leaderboard |
| `getLoserRank` | Get loser leaderboard |
| `updateWinScore` | Update win score |
| `updateLoseScore` | Update lose score |
| `battleController` | Online battle control |
| `cleanupRooms` | Clean up expired rooms |
| `feedback_api` | User feedback interface |

**Deployment Method:**
1. Right-click the cloud function folder in WeChat Developer Tools
2. Select "Create and Deploy: Cloud Install Dependencies"

### Create Database

In the cloud development console database, create the following collections:

| Collection | Purpose | Permission |
|------------|---------|------------|
| `users` | Store user basic info | User readable, creator writable |
| `records` | Store game battle records | User readable, creator writable |
| `daily_challenges` | Store daily challenge data | All users readable and writable |
| `daily_rankings` | Store daily challenge leaderboard | All users readable and writable |
| `global_rankings` | Store global leaderboard | All users readable and writable |
| `loser_rankings` | Store loser leaderboard | All users readable and writable |
| `rooms` | Store online battle rooms | All users readable and writable |
| `feedback` | Store user feedback | User readable, creator writable |
| `puzzle_levels` | Store puzzle level data | All users readable and writable |
| `puzzle_progress` | Store player progress | User readable, creator writable |

## Project Structure

```
number-bomb/
├── cloudfunctions/          # Cloud functions directory
│   ├── saveUser/           # Save user info
│   ├── saveRecord/         # Save game record
│   ├── updateRecord/       # Update game record
│   ├── getRecords/         # Get record list
│   ├── getRecordDetail/    # Get record details
│   ├── getDailyInfo/       # Get daily challenge info
│   ├── startDailyChallenge/# Start daily challenge
│   ├── submitDailyResult/  # Submit challenge result
│   ├── getDailyRank/       # Get daily leaderboard
│   ├── getGlobalRank/      # Get global leaderboard
│   ├── getLoserRank/       # Get loser leaderboard
│   ├── updateWinScore/     # Update win score
│   ├── updateLoseScore/    # Update lose score
│   ├── battleController/   # Online battle control
│   ├── cleanupRooms/       # Clean up expired rooms
│   └── feedback_api/       # User feedback interface
├── pages/                   # Pages directory
│   ├── index/              # Home page
│   ├── ranking/            # Leaderboard
│   ├── rules/              # Game rules
│   ├── names/              # Player settings
│   ├── coin/               # Coin toss
│   ├── secret/             # Set password
│   ├── intermission/       # Intermission
│   ├── game/               # Number guessing game
│   ├── result/             # Round result
│   ├── victory/            # Victory settlement
│   ├── color-mode/         # Color mode selection
│   ├── color-game/         # Color guessing game
│   ├── color-result/       # Color round result
│   ├── color-victory/      # Color victory screen
│   ├── color-gameover/     # Color game over
│   ├── records/            # Battle history
│   ├── record-detail/      # Record details
│   ├── feedback/           # User feedback
│   ├── daily-game/         # Daily challenge (number)
│   ├── daily-color/        # Daily challenge (color)
│   ├── weekend/            # Weekend events
│   └── puzzle-game/        # Puzzle solving
├── utils/                   # Utility functions
│   ├── audio.js            # Audio management
│   ├── dailyChallenge.js   # Daily challenge tools
│   └── historyManager.js   # History management
├── icons/                   # Icon resources
├── images/                  # Image resources
├── app.js                   # App entry
├── app.json                 # App config
├── app.wxss                 # Global styles
├── project.config.json      # Project config
├── project.private.config.json # Private config
└── sitemap.json             # Sitemap
```

## Game Rules

### Number Guessing

#### Basic Rules
- **Players**: 2
- **Goal**: Guess the opponent's 4-digit password

#### Game Flow
1. **Set Password**: At the start of each round, the current player sets a 4-digit password (0-9, repeatable)
2. **Take Turns Guessing**: The opponent guesses the number within limited attempts (default 10)
3. **Guess Hint**: After each guess, the system gives A/B hints:
   - **A (Position correct)**: Correct number and correct position
   - **B (Number correct)**: Correct number but wrong position
4. **Round End**: Round ends when password is guessed or attempts run out, then switch offense/defense
5. **Match End**: First player to guess opponent's password wins

#### Example
- Correct answer: `5 2 8 3`
- Player guess: `5 3 7 2`
- Hint result: **1A2B**
  - 1A: Number 5 is in correct position
  - 2B: Numbers 2 and 3 exist but wrong position

### Color Guessing

#### Basic Rules
- **Players**: 2
- **Goal**: Guess the system's 4-color combination

#### Available Colors
6 colors available:
- 🔴 Red
- 🟡 Yellow
- 🔵 Blue
- 🟢 Green
- 🟣 Purple
- 🟠 Orange

#### Game Modes
1. **Easy Mode**: Colors can repeat (e.g., red-red-blue-green)
2. **Hard Mode**: Colors cannot repeat (all 4 positions have different colors)

#### Game Flow
1. **System Generates Password**: System generates a 4-color password at game start
2. **Take Turns Guessing**: Both players take turns guessing the color combination
3. **Guess Hint**: After each guess, the system gives red/white hints:
   - **🔴 Red**: Correct color and correct position
   - **⚪ White**: Correct color but wrong position
4. **Round End**: Game ends when password is guessed or attempts run out
5. **Match End**: First player to guess password wins

## Changelog

### v1.0.0
- ✅ Complete number guessing game
- ✅ Color guessing game mode
- ✅ Daily challenge system
- ✅ Puzzle solving levels
- ✅ Online battle feature
- ✅ Leaderboard system
- ✅ User feedback system
- ✅ Cloud save game records

## Support

For questions or suggestions, feel free to contact!

- WeChat: SURFDUCK
- Xiaohongshu: 4682B4

---

## 📄 License

本源码仅供学习交流使用，未经授权不得用于商业用途。

This source code is for learning and communication purposes only, unauthorized commercial use is prohibited.

---

<div align="center">

**祝你使用愉快！ | Enjoy the game! 🎮**

</div>
