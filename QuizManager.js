import Api, { Difficulty } from './Api';
const decode = require('ent/decode');

class QuizManager {
    constructor() {
        this.quizzes = {};
        this.api = new Api();
    }
    
    get categories() {
        return this.api.categories;
    }
    
    categoryById(categoryId) {
        return this.categories.find(category => category.id == categoryId);
    }
    
    generateRandomCategoryId() {
        return Math.floor(Math.random() * this.categories.length);
    }
    
    nextQuestion(chatId) {
        if (!this.quizzes[chatId]) return null;
        
        const nextIndex = ++this.quizzes[chatId].questionIndex;
        const item = this.quizzes[chatId].questions[nextIndex];
        
        return item;
    }
    
    answerForQuestion(question, answerIndex) {
        if (answerIndex === -1) {
            return question.correct_answer.text;
        }
        
        return question.incorrect_answers[answerIndex].text;
    }
    
    newQuiz(categoryId, difficulty, chatId) {
        return new Promise((resolve, reject) => {
            this.api.getQuiz(categoryId, difficulty).then((items) => {
                
                items = items.map((item, index) => {
                    item.question = decode(item.question);
                    
                    item.correct_answer = {
                        data: {
                            index,
                            answerIndex: -1,
                            correct: true
                        },
                        text: decode(item.correct_answer),
                    };
                    
                    item.incorrect_answers = item.incorrect_answers.map((text, idx) => {
                        return {
                            data: {
                                index,
                                answerIndex: idx,
                                correct: false
                            },
                            text: decode(text)
                        };
                    });
                    
                    return item;
                });
                
                this.quizzes[chatId] = {
                    questions: items,
                    questionIndex: -1,
                    answers: []
                };
                this.quizzes[chatId].answers.length = items.length;
                
                resolve(this.nextQuestion(chatId));
                
            }).catch(reject);
        });
    }
    
    hasQuiz(chatId) {
        return this.quizzes[chatId] != null;
    }
    
    cancelQuiz(chatId) {
        delete this.quizzes[chatId];
    }
    
    answerQuestion(chatId, answer) {
        if (!this.quizzes[chatId]) return null;
        
        const index = this.quizzes[chatId].questionIndex;
        const question = this.quizzes[chatId].questions[index];
        const answers = this.quizzes[chatId].answers;
        
        if (answers[answer.index] !== undefined) {
            return null;
        }
        
        const correct = answer.correct;
        answers[index] = correct;
        const nextQuestionItem = this.nextQuestion(chatId);
        
        const correctCount = answers.reduce((prevVal, val) => {
            return val === true ? prevVal + 1 : prevVal;
        }, 0);
        const incorrectCount = answers.reduce((prevVal, val) => {
            return val === false ? prevVal + 1 : prevVal;
        }, 0);
        
        return {
            correct,
            yourAnswer: this.answerForQuestion(question, answer.answerIndex),
            correctAnswer: question.correct_answer.text,
            nextQuestionItem,
            completed: nextQuestionItem == null,
            correctCount,
            incorrectCount,
            totalCount: answers.length
        };
    }
}

export default QuizManager;
