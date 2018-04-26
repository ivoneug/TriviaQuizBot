import { token } from './token';
import { Difficulty } from './Api';
import QuizManager from './QuizManager';
const TelegramBot = require('node-telegram-bot-api');

const quizManager = new QuizManager();

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {
    polling: true
});

const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const askQuestion = (chatId, item) => {
    if (!item) return;
    
    const answers = shuffle([].concat(item.correct_answer).concat(item.incorrect_answers));
    const buttons = answers.map(answer => {
        return [{
            text: answer.text,
            callback_data: JSON.stringify(answer.data)
        }];
    });
    
    bot.sendMessage(chatId, item.question, {
        reply_markup: {
            inline_keyboard: buttons
        }
    });
};

const replyToAnswer = (chatId, result) => {
    const answeredMessage = `<i>You answered:</i> <b>${result.yourAnswer}</b>\n\n`;
    let message = result.correct ? `\u{1F44D} <b>You're right man!</b> It's: <i>${result.correctAnswer}</i>` : `\u{1F44E} <b>Sorry, you're wrong...</b> Correct answer is: <i>${result.correctAnswer}</i>`;
    
    if (result.completed) {
        message += `\n\u{1F389}\u{1F389}\u{1F389} <b>Great Job!</b> You've got <b>${result.correctCount} correct</b> out of <b>${result.totalCount}</b>! \u{1F389}\u{1F389}\u{1F389}`;
        quizManager.cancelQuiz(chatId);
    }
    
    bot.sendMessage(chatId, answeredMessage + message, { parse_mode: 'html' });
};

bot.onText(/\/start(?:_)*(easy)*(medium)*(hard)*/, (msg, match) => {
    const chatId = msg.chat.id;
    let difficulty = Difficulty.Any;
    
    for (let i = 1; i < match.length; i++) {
        if (match[i] !== undefined) {
            
            switch (match[i]) {
                case Difficulty.Easy:
                    difficulty = Difficulty.Easy;
                    break;
                    
                case Difficulty.Medium:
                    difficulty = Difficulty.Medium;
                    break;
                    
                case Difficulty.Hard:
                    difficulty = Difficulty.Hard;
                    break;
            }
            
            break;
        }
    }

    const buttons = quizManager.categories.map(category => {
        return [{
            text: category.name,
            callback_data: JSON.stringify({ category: category.id, difficulty })
        }];
    });

    buttons.unshift([{
        text: '\u{1F3B2} Random Category',
        callback_data: -1
    }]);

    bot.sendMessage(chatId, `Hi there! I have ${buttons.length} categories to play`, {
        reply_markup: {
            inline_keyboard: buttons
        }
    });
});

bot.onText(/\/stop/, (msg, match) => {
    const chatId = msg.chat.id;
    
    if (quizManager.hasQuiz(chatId)) {
        quizManager.cancelQuiz(chatId);
        bot.sendMessage(chatId, 'Quiz has been finished in this chat');
    } else {
        bot.sendMessage(chatId, 'Sorry, you don\'t have any quiz started in this chat');
    }
});

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    let data = JSON.parse(callbackQuery.data);
    
    const hasQuiz = quizManager.hasQuiz(chatId);
    
    if (hasQuiz && data.category != null) {
        bot.answerCallbackQuery(callbackQuery.id, '', false);
        // bot.sendMessage(chatId, 'Sorry, but you already started a quiz. Finish this one first');
        return;
    }
    if (!hasQuiz && data.category == null) {
        bot.answerCallbackQuery(callbackQuery.id, '', false);
        // bot.sendMessage(chatId, 'Sorry, you don\'t have any quiz started in this chat');
        return;
    }
    
    if (hasQuiz) {
        bot.answerCallbackQuery(callbackQuery.id, '', false);
        
        const result = quizManager.answerQuestion(chatId, data);
        
        // fraud detected
        if (!result) {
            // bot.sendMessage(chatId, 'Sorry, but you already answered this question');
            return;
        }
        
        replyToAnswer(chatId, result);
        
        if (!result.completed) {
            setTimeout(() => {
                askQuestion(chatId, result.nextQuestionItem);
            }, 500);
        }
    } else {
        const categoryId = data.category === -1 ? quizManager.generateRandomCategoryId() : data.category;
        
        const category = quizManager.categoryById(categoryId);
        const difficulty = data.difficulty;
        bot.sendMessage(chatId, `<i>Selected category: </i><b>${category.name}</b>, <i>difficulty: </i><b>${difficulty}</b>\n\n\u{23F3} <i>Starting a new quiz...</i>`, { parse_mode: 'html' });
        
        quizManager.newQuiz(categoryId, difficulty, chatId).then((question) => {
            bot.answerCallbackQuery(callbackQuery.id, '', false);
            askQuestion(chatId, question);
        });
    }
});
