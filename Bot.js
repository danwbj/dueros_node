var BaseBot = require('bot-sdk');
// var Datastore = require('nedb');
var _ = require('lodash');
// var db2 = new Datastore({ filename: 'db/song2.db', autoload: true });
var db = require('./db')
let users_level = {}
class Bot extends BaseBot {
    constructor(postData) {
        super(postData);
        let userId = this.request.getUserId()

        this.addLaunchHandler(() => {
            this.waitAnswer()
            return {outputSpeech: `
            欢迎使用单词量测试! 5分钟，评估你的单词量
            评估过程包括三步：
            1. 选择适合你的出题范围
            2. 通过50个单词得到你的大致词汇量范围
            准备好了请开始第一步，请说：级别
            `};
        });

        this.addSessionEndedHandler(() => {
            this.waitAnswer()
            return {outputSpeech: '再见'}
        })

        this.addIntentHandler('select_level', () => {
            this.waitAnswer()
            return {outputSpeech: `
        您想要测试什么级别的英语单词量呢？四级、六级、英专
          `}
        });
        this.addIntentHandler('level_ok', () => { 
            var level = this.getSlot('level')
            users_level[userId] = level
            this.waitAnswer()
            return {outputSpeech: `
            您选择了${level}单词量测试，准备好了请说:开始测试
            `};

        })
        this.addIntentHandler('start_q', () => {
            /**
         * 获取对应的测试数据
         */
            // var level = this.getSlot('level')
            // console.log('level: ', level);
            let q = []
            let vocabulary = 0
            let level= users_level[userId]
            if (level == '四级') {
                vocabulary = 4000
                q = db.cet_4
            } else if (level == '六级') {
                vocabulary = 6000
                q = db.cet_6
            } else if (level == '英专') {
                vocabulary = 14000
                q = db.tem
            }
            var self = this;
            
            var answer = this.getSlot('answer')
            let index = 0;
            var a = '';
            var score = 0;

            if (answer) {
                index = self.getSessionAttribute('index')
                console.log('index: ', index);
                if (!index) { 
                    index = 0;
                }
                //a = self.getSessionAttribute('abb')
                a = getAbc(q[index].pk, q[index].definition_choices);
                score = self.getSessionAttribute('score')
                console.log('score: ', score);
                if (!score) { 
                    score = 0;
                }
                var outputSpeech = ''
                var result = ''
                if (answer == a) {
                    score++
                    self.setSessionAttribute('score', score)

                    result = `您选择${answer}，恭喜您答对了！<slience time="3s"></slience>`

                } else {
                    result = `您选择${answer}，抱歉您答错了！ 正确答案是${a}。<slience time="3s"></slience>`
                }
                index++
                a = getAbc(q[index].pk, q[index].definition_choices);
                // self.setSessionAttribute("abb", a);
                if (index < 5) { 
                    self.setSessionAttribute('index', index)
                    outputSpeech = `
                    <speak>
                        ${result}
                        请听下一题
                        ${q[index].content}
                        <slience time="5s"></slience>
                        a. <slience time="1s"></slience>${q[index].definition_choices[0].definition.split('. ')[1]}; <slience time="3s"></slience>
                        b. <slience time="1s"></slience>${q[index].definition_choices[1].definition.split('. ')[1]}; <slience time="3s"></slience>
                        c. <slience time="1s"></slience>${q[index].definition_choices[2].definition.split('. ')[1]}; <slience time="3s"></slience>
                        d. <slience time="1s"></slience>${q[index].definition_choices[3].definition.split('. ')[1]}; <slience time="3s"></slience>请选择！
                    </speak>  
                    `
                    this.nlu.ask('answer');
                    this.waitAnswer()
                    return {
                      outputSpeech: outputSpeech,
                      reprompt: '请选择!'
                    }
                  } else {
        
                    console.log('-----------', index)
                    console.log('-----------',score)
                    outputSpeech = `
                    <speak>
                    ${result}
                    您在本轮总共答对了${score}个单词！
                    您的单词量大约为：${Math.ceil(parseInt(score)/index*vocabulary)}
                    </speak>        
                    `
                    this.clearSessionAttribute()
                    this.endSession()
                    this.waitAnswer()
                    return {
                      outputSpeech: outputSpeech,
                    }
                  }
          
                }

            
            
            a = getAbc(q[index].pk, q[index].definition_choices);
            self.setSessionAttribute("index", index);
            // self.setSessionAttribute("abb", a);
            self.setSessionAttribute("score", score);
            this.waitAnswer()
            return new Promise(function (resolve, reject) {
                resolve({outputSpeech: `
                    <speak>
                    总共${q.length}道题，现在开始测试，请听第一题：
                    ${q[index].content}
                    <slience time="5s"></slience>
                        a. <slience time="1s"></slience>${q[index].definition_choices[0].definition.split('. ')[1]}; <slience time="3s"></slience>
                        b. <slience time="1s"></slience>${q[index].definition_choices[1].definition.split('. ')[1]}; <slience time="3s"></slience>
                        c. <slience time="1s"></slience>${q[index].definition_choices[2].definition.split('. ')[1]}; <slience time="3s"></slience>
                        d. <slience time="1s"></slience>${q[index].definition_choices[3].definition.split('. ')[1]}; <slience time="3s"></slience>abc您选哪一个？
                    </speak>
                    `, reprompt: 'abcd您选哪一个？'})
            })

            function getAbc(pk, q) {
                
                let q1 = _.findIndex(q, function (o) {
                    return o.pk == pk;
                });
                let a = "";
                switch (q1) {
                    case 0:
                        a = 'a';
                        break;
                    case 1:
                        a = 'b';
                        break;
                    case 2:
                        a = 'c';
                        break;
                    case 3:
                        a = 'd';
                        break;
                    default:
                        a = '';
                        break;
                }
                return a;
            }

        });
    }
}

module.exports = Bot;