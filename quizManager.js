// 本地存储工具类
const StorageService = {
    set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
    get(key, defaultValue = null) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    },
    remove(key) { localStorage.removeItem(key); }
};
if (!StorageService.get('wrongList')) StorageService.set('wrongList', []);
if (!StorageService.get('collectList')) StorageService.set('collectList', []);
if (!StorageService.get('theme')) StorageService.set('theme', 'light');

// AI解析服务（模拟流式打字）
const AIService = {
    typeWriter(element, text, speed = 30) {
        let i = 0;
        element.innerHTML = '';
        const timer = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else clearInterval(timer);
        }, speed);
    },
    getAnalysis(question) {
        return new Promise(resolve => {
            setTimeout(() => resolve(question.analysis), 800);
        });
    }
};

// 刷题核心管理类（面向对象，复杂度核心）
class QuizManager {
    constructor() {
        this.questionBank = {};
        this.currentList = [];
        this.index = 0;
        this.selected = -1;
        this.score = 0;
        this.correct = 0;
        this.wrong = 0;
        this.mode = 'practice';
        this.timer = 0;
        this.timerInterval = null;
        this.wrongList = StorageService.get('wrongList');
        this.collectList = StorageService.get('collectList');
        this.dom = this.getDOMElements();
        this.initEventListeners();
    }

    // 获取DOM元素
    getDOMElements() {
        return {
            question: document.getElementById('question'),
            qNum: document.getElementById('q-num'),
            total: document.getElementById('total'),
            options: document.getElementById('options'),
            score: document.getElementById('score'),
            correct: document.getElementById('correct'),
            wrong: document.getElementById('wrong'),
            timer: document.getElementById('timer'),
            progress: document.querySelector('.progress-fill'),
            aiContent: document.getElementById('ai-content'),
            modal: document.getElementById('exam-modal')
        };
    }

    // 初始化事件监听
    initEventListeners() {
        // 分类切换
        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchCategory(btn.dataset.cat));
        });
        // 上下题
        document.querySelector('.prev-btn').addEventListener('click', () => this.prevQuestion());
        document.querySelector('.next-btn').addEventListener('click', () => this.nextQuestion());
        // 提交答案
        document.querySelector('.check-btn').addEventListener('click', () => this.checkAnswer());
        // AI解析
        document.querySelector('.ai-btn').addEventListener('click', () => this.showAnalysis());
        // 模式切换
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });
        // 难度筛选
        document.querySelector('.diff-select').addEventListener('change', (e) => this.filterByDiff(e.target.value));
        // 随机抽题
        document.querySelector('.random-btn').addEventListener('click', () => this.randomQuestion());
        // 错题本
        document.querySelector('.wrong-btn').addEventListener('click', () => this.loadWrongList());
        // 收藏题目
        document.querySelector('.collect-btn').addEventListener('click', () => this.collectQuestion());
        // 关闭弹窗
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.dom.modal.classList.remove('active');
        });
        // 主题切换
        document.querySelector('.theme-toggle').addEventListener('click', () => this.toggleTheme());
    }

    // 加载题库（直接内置，彻底解决路径坑）
    async loadQuestionBank() {
        this.questionBank = {
            "java": [
                {
                    "title": "Java中，main方法的返回值类型是？",
                    "options": ["void", "int", "String", "public"],
                    "answer": 0,
                    "difficulty": "easy",
                    "analysis": "main方法是Java程序的入口方法，固定格式为public static void main(String[] args)，返回值类型必须为void，代表方法无返回值。"
                },
                {
                    "title": "下列哪个是Java的基本数据类型？",
                    "options": ["String", "Integer", "int", "List"],
                    "answer": 2,
                    "difficulty": "easy",
                    "analysis": "Java的基本数据类型包括byte、short、int、long、float、double、boolean、char；int是基本类型，其他选项均为引用类型。"
                },
                {
                    "title": "Java中，多态的实现不依赖于以下哪项？",
                    "options": ["继承", "重写", "父类引用指向子类对象", "接口"],
                    "answer": 3,
                    "difficulty": "medium",
                    "analysis": "Java多态的三个必要条件：继承、重写、父类引用指向子类对象；接口是实现多态的一种方式，但不是必要条件，核心是继承+重写。"
                }
            ],
            "frontend": [
                {
                    "title": "JavaScript中，哪个关键字用于声明常量？",
                    "options": ["var", "let", "const", "static"],
                    "answer": 2,
                    "difficulty": "easy",
                    "analysis": "const用于声明常量，值不可修改；let声明块级变量；var声明函数级变量；static是类的静态关键字，不是变量声明关键字。"
                },
                {
                    "title": "CSS中，哪个属性用于实现弹性布局？",
                    "options": ["grid", "flex", "block", "inline"],
                    "answer": 1,
                    "difficulty": "easy",
                    "analysis": "display: flex用于实现弹性布局，是现代响应式布局的核心方案；grid是网格布局；block/inline是常规布局属性。"
                },
                {
                    "title": "下列哪个是HTML5的新特性？",
                    "options": ["div", "canvas", "span", "h1"],
                    "answer": 1,
                    "difficulty": "medium",
                    "analysis": "canvas是HTML5新增的绘图标签，用于在页面上绘制图形；div、span、h1都是HTML4就存在的标签。"
                }
            ],
            "network": [
                {
                    "title": "HTTP协议默认使用的端口号是？",
                    "options": ["80", "443", "8080", "21"],
                    "answer": 0,
                    "difficulty": "easy",
                    "analysis": "HTTP默认端口80，HTTPS默认443，8080是常用应用服务器端口，21是FTP端口，正确答案为80。"
                },
                {
                    "title": "TCP协议属于OSI模型的哪一层？",
                    "options": ["物理层", "数据链路层", "网络层", "传输层"],
                    "answer": 3,
                    "difficulty": "medium",
                    "analysis": "TCP（传输控制协议）和UDP都属于OSI模型中的传输层协议，负责端到端的数据传输和流量控制，正确答案是传输层。"
                }
            ],
            "datastructure": [
                {
                    "title": "栈（Stack）的操作遵循什么原则？",
                    "options": ["先进先出", "先进后出", "随机访问", "循环队列"],
                    "answer": 1,
                    "difficulty": "easy",
                    "analysis": "栈遵循先进后出（LIFO）原则，只能在栈顶进行插入和删除操作；队列遵循先进先出（FIFO）原则。"
                },
                {
                    "title": "下列哪种数据结构是线性结构？",
                    "options": ["树", "图", "数组", "哈希表"],
                    "answer": 2,
                    "difficulty": "medium",
                    "analysis": "数组是典型的线性数据结构，元素之间存在一对一的线性关系；树和图属于非线性结构；哈希表是存储结构，不是线性结构。"
                }
            ]
        };

        // 加载第一题
        this.currentList = this.questionBank.java;
        this.loadQuestion();
        this.updateScore();
        this.startTimer();
    }

    // 加载题目
    loadQuestion() {
        if (this.currentList.length === 0) {
            this.dom.question.innerText = '该分类暂无题目';
            this.dom.options.innerHTML = '';
            return;
        }

        const q = this.currentList[this.index];
        this.dom.question.innerText = q.title;
        this.dom.qNum.innerText = this.index + 1;
        this.dom.total.innerText = this.currentList.length;
        this.dom.options.innerHTML = '';
        this.selected = -1;
        this.dom.aiContent.innerText = '';

        // 渲染选项
        q.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.addEventListener('click', () => this.selectOption(btn, i));
            this.dom.options.appendChild(btn);
        });

        // 更新进度条
        this.updateProgress();
    }

    // 选择选项
    selectOption(btn, index) {
        // 清除其他选中状态
        this.dom.options.querySelectorAll('button').forEach(b => {
            b.classList.remove('selected', 'correct', 'incorrect');
        });

        // 设置当前选中
        btn.classList.add('selected');
        this.selected = index;
    }

    // 提交答案
    checkAnswer() {
        if (this.selected === -1) return alert('请先选择答案');

        const q = this.currentList[this.index];
        const btns = this.dom.options.querySelectorAll('button');

        // 显示对错
        btns[q.answer].classList.add('correct');
        if (this.selected !== q.answer) {
            btns[this.selected].classList.add('incorrect');
            this.wrong++;
            // 加入错题本
            if (!this.wrongList.some(item => item.title === q.title)) {
                this.wrongList.push(q);
                StorageService.set('wrongList', this.wrongList);
            }
        } else {
            this.correct++;
            this.score += 10;
        }

        this.updateScore();
    }

    // 上下题
    nextQuestion() {
        if (this.index < this.currentList.length - 1) {
            this.index++;
            this.loadQuestion();
        } else if (this.mode === 'exam') {
            this.endExam();
        }
    }

    prevQuestion() {
        if (this.index > 0) {
            this.index--;
            this.loadQuestion();
        }
    }

    // 切换分类
    switchCategory(cat) {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-cat="${cat}"]`).classList.add('active');
        this.currentList = this.questionBank[cat];
        this.index = 0;
        this.loadQuestion();
    }

    // 切换模式
    switchMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
        this.mode = mode;
        this.index = 0;
        this.loadQuestion();

        if (mode === 'exam') {
            this.resetExam();
        }
    }

    // 难度筛选
    filterByDiff(diff) {
        if (diff === 'all') {
            this.currentList = this.questionBank.java;
        } else {
            this.currentList = this.questionBank.java.filter(q => q.difficulty === diff);
        }
        this.index = 0;
        this.loadQuestion();
    }

    // 随机抽题
    randomQuestion() {
        const allQuestions = Object.values(this.questionBank).flat();
        this.currentList = [allQuestions[Math.floor(Math.random() * allQuestions.length)]];
        this.index = 0;
        this.loadQuestion();
    }

    // 加载错题本
    loadWrongList() {
        if (this.wrongList.length === 0) return alert('暂无错题');
        this.currentList = this.wrongList;
        this.index = 0;
        this.loadQuestion();
    }

    // 收藏题目
    collectQuestion() {
        const q = this.currentList[this.index];
        if (this.collectList.some(item => item.title === q.title)) {
            alert('已收藏过本题');
            return;
        }
        this.collectList.push(q);
        StorageService.set('collectList', this.collectList);
        alert('收藏成功');
    }

    // 显示AI解析
    async showAnalysis() {
        const q = this.currentList[this.index];
        this.dom.aiContent.innerText = 'AI正在生成解析...';
        const analysis = await AIService.getAnalysis(q);
        AIService.typeWriter(this.dom.aiContent, analysis);
    }

    // 考试模式结束
    endExam() {
        clearInterval(this.timerInterval);
        const rate = ((this.correct / this.currentList.length) * 100).toFixed(1);
        document.getElementById('exam-total').innerText = this.currentList.length;
        document.getElementById('exam-correct').innerText = this.correct;
        document.getElementById('exam-rate').innerText = `${rate}%`;
        document.getElementById('exam-time').innerText = this.formatTime(this.timer);
        this.dom.modal.classList.add('active');
    }

    // 重置考试
    resetExam() {
        this.score = 0;
        this.correct = 0;
        this.wrong = 0;
        this.timer = 0;
        this.updateScore();
        this.startTimer();
    }

    // 计时
    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.dom.timer.innerText = this.formatTime(this.timer);
        }, 1000);
    }

    // 格式化时间
    formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = (seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    // 更新进度条
    updateProgress() {
        const percent = ((this.index + 1) / this.currentList.length) * 100;
        this.dom.progress.style.width = `${percent}%`;
    }

    // 更新计分板
    updateScore() {
        this.dom.score.innerText = this.score;
        this.dom.correct.innerText = this.correct;
        this.dom.wrong.innerText = this.wrong;
    }

    // 切换主题
    toggleTheme() {
        const body = document.body;
        const btn = document.querySelector('.theme-toggle');
        if (body.classList.contains('dark')) {
            body.classList.remove('dark');
            btn.innerText = '🌙 暗黑模式';
            StorageService.set('theme', 'light');
        } else {
            body.classList.add('dark');
            btn.innerText = '☀️ 亮色模式';
            StorageService.set('theme', 'dark');
        }
    }
}

// 初始化系统
const quiz = new QuizManager();
quiz.loadQuestionBank();

// 初始化主题
const theme = StorageService.get('theme');
if (theme === 'dark') {
    document.body.classList.add('dark');
    document.querySelector('.theme-toggle').innerText = '☀️ 亮色模式';
}