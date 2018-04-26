import axios from 'axios';

export const Difficulty = {
    Any: 'any',
    Easy: 'easy',
    Medium: 'medium',
    Hard: 'hard'
};

class Api {
    constructor() {
        axios.get('https://opentdb.com/api_category.php').then((response) => {
            if (response && response.data) {
                this._categories = response.data.trivia_categories;
            }
        });
    }
    
    getQuiz(categoryId, difficulty, multiple = true) {
        return new Promise((resolve, reject) => {
            let url = `https://opentdb.com/api.php?amount=10&category=${categoryId}&type=${multiple ? 'multiple' : 'boolean'}`;
            if (difficulty !== Difficulty.Any) {
                url += `&difficulty=${difficulty}`;
            }
            axios.get(url)
                .then((response) => {
                    if (response && response.data) {
                        resolve(response.data.results);
                    } else {
                        reject();
                    }
                }).catch(reject);
        });
    }
    
    get categories() {
        return this._categories;
    }
}

export default Api;
