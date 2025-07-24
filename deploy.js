const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const sourceDir = "D:\\test"; // 填写你的 hexo 项目目录
const targetDir = "C:\\Users\\wangzijian\\Desktop\\新建文件夹"; // 填写你的目标 git 目录

function run(cmd, cwd = process.cwd()) {
    console.log(`运行命令: ${cmd} (cwd: ${cwd})`);
    execSync(cmd, { stdio: 'inherit', cwd });
}

// 1. 生成 hexo 静态文件
run('hexo generate', sourceDir);

// 2. 拉取最新 main 分支
gitPull();
function gitPull() {
    run('git pull origin main', targetDir);
}

// 3. 清空 targetDir 下除 .git 外的所有内容
function emptyDirExceptGit(dir) {
    for (const file of fs.readdirSync(dir)) {
        if (file === '.git') continue;
        const filePath = path.join(dir, file);
        fs.rmSync(filePath, { recursive: true, force: true });
    }
}
emptyDirExceptGit(targetDir);

// 4. 拷贝 sourceDir/public 到 targetDir
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
copyDir(path.join(sourceDir, 'public'), targetDir);

// 5. git add
run('git add .', targetDir);

// 判断是否有变更再 commit/push
const status = execSync('git status --porcelain', { cwd: targetDir }).toString().trim();
if (status) {
    run('git commit -m "update"', targetDir);
    run('git push origin main', targetDir);
} else {
    console.log('没有需要提交的更改，跳过 commit 和 push。');
}
