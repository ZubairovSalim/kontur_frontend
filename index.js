const { getAllFilePathsWithExtension, readFile } = require('./fileSystem');
const { readLine } = require('./console');

const ERROR_MESSAGE = 'wrong command';

app();

function app () {
    const files = getFiles();

    console.log('Please, write your command!');
    readLine(processCommand, files);
}

function getFiles () {
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    return filePaths.map(path => {
        return {
            filename: path.split('/')[path.split('/').length - 1],
            file:readFile(path)
        };
    });
}

function processCommand (command, files) {
    let allTODO = findTODO(files);
    let parsedTODO = parseTODO(allTODO);

    let mas = command.split(' ').filter(el => el !== "");
    let splittedCommand = [mas[0]];
    splittedCommand.push(mas.slice(1).join(' '));

    switch (splittedCommand[0]) {
        case 'exit':
            process.exit(0);
            break;
        case 'show':
            Comment.showCommentsTable(parsedTODO);
            break;
        case 'important':
            Comment.showCommentsTable(parsedTODO.filter(c => c.importance > 0));
            break;
        case 'user':
            if(splittedCommand[1] === '') {
                console.log(ERROR_MESSAGE);
                break;
            }
            let name = splittedCommand[1].toLowerCase();
            Comment.showCommentsTable(parsedTODO.filter(c => c.user.toLowerCase().indexOf(name) === 0));
            break;
        case 'date':
            if(splittedCommand[1] === '' || !dateIsCorrect(splittedCommand[1])) {
                console.log(ERROR_MESSAGE);
                break;
            }
            let date = new Date(splittedCommand[1]);
            dataCommentTable(parsedTODO, date);
            break;
        case 'sort':
            if(splittedCommand[1] === '') {
                console.log(ERROR_MESSAGE);
                break;
            }
            let criterion = splittedCommand[1];
            sortCommentTable(parsedTODO, criterion);
            break;
        default:
            console.log(ERROR_MESSAGE);
            break;
    }
}

function findTODO (files) {
    let mas = [];
    let regex = /\/\/\s*todo(?!\s*:?\s*\n|$)\s*:?\s*(.*)$/igm;

    files.forEach(f => {
        let matches = [];

        while((matches = regex.exec(f.file)) !== null) {
            mas.push({
                filename: f.filename,
                comment: matches[1]
            });
        }
    });

    return mas;
}

function parseTODO(comments) {
    let parsedComments = [];

    comments.forEach(c => {
        let importance = "";
        let user = "";
        let date = "";
        let parsedComment = "";
        let filename = c.filename;


        importance = (c.comment.match(/!/g) || []).length;

        let arr = c.comment.split(';');

        if(arr.length === 3) {
            user = arr[0].trim();
            date = arr[1].trim();
            parsedComment = arr[2].trim();
        }
        else {
            parsedComment = c.comment;
        }

        parsedComments.push(new Comment(importance, user, date, parsedComment, filename));
    });

    return parsedComments;
}

class Comment {
    constructor(importance, user, date, comment, filename) {
        this.importance = importance;
        this.user = user;
        this.date = dateIsCorrect(date) ? new Date(date) : new Date(NaN);
        this.comment = comment;
        this.filename = filename;
        this.dateStr = date;
    }

    static showCommentsTable(Comments) {
        let col2Width = Math.max.apply(null, Comments.map(c => c.user.length));
        let col3Width = Math.max.apply(null, Comments.map(c => c.dateStr.length));
        let col4Width = Math.max.apply(null, Comments.map(c => c.comment.length));
        let col5Width = Math.max.apply(null, Comments.map(c => c.filename.length));

        col2Width = col2Width >= 4 && col2Width < 10  ? col2Width : col2Width < 4 ? 4 : 10;
        col3Width = col3Width >= 4 && col3Width < 10  ? col3Width : col3Width < 4 ? 4 : 10;
        col4Width = col4Width >= 7 && col4Width < 50  ? col4Width : col4Width < 7 ? 7 : 50;
        col5Width = col5Width >= 8 && col5Width < 15  ? col5Width : col5Width < 8 ? 8 : 15;

        let dif2 = (col2Width - 4) > 0 ? (col2Width - 4) : 0;
        let dif3 = (col3Width - 4) > 0 ? (col3Width - 4) : 0;
        let dif4 = (col4Width - 7) > 0 ? (col4Width - 7) : 0;
        let dif5 = (col5Width - 8) > 0 ? (col5Width - 8) : 0;

        let allWidth = 1 + col2Width + col3Width + col4Width + col5Width + 20 + 4;

        let header = "  !  |  user" + " ".repeat(dif2) + "  |  date" + " ".repeat(dif3) + "  |  comment" +
            " ".repeat(dif4) + "  |  fileName" + " ".repeat(dif5) + "  \n";

        header += "-".repeat(allWidth);

        let content = Comments.reduce((coms, c) => {
            let dif2 = (col2Width - c.user.length) > 0 ? (col2Width - c.user.length) : 0;
            let dif3 = (col3Width - c.dateStr.length) > 0 ? (col3Width - c.dateStr.length) : 0;
            let dif4 = (col4Width - c.comment.length) > 0 ? (col4Width - c.comment.length) : 0;
            let dif5 = (col5Width - c.filename.length) > 0 ? (col5Width - c.filename.length) : 0;

            let importance = c.importance > 0 ? "!" : " ";
            let user = c.user.length > col2Width ? c.user.substring(0, col2Width-3) + "..." : c.user;
            let date = c.dateStr.length > col3Width ? c.dateStr.substring(0, col3Width-3) + "..." : c.dateStr;
            let comment = c.comment.length > col4Width ? c.comment.substring(0, col4Width-3) + "..." : c.comment;
            let filename = c.filename.length > col5Width ? c.filename.substring(0, col5Width-3) + "..." : c.filename;

            return coms + ("  " + importance + "  |  " + user + " ".repeat(dif2) + "  |  " + date + " ".repeat(dif3) +
                "  |  " + comment + " ".repeat(dif4) + "  |  " + filename + " ".repeat(dif5) + "  \n");
        }, header + "\n");

        let footer = "-".repeat(allWidth);

        Comments.length !== 0 ? console.log(content + footer) : console.log(content.substring(0, content.length - 1));
    }
}

function dataCommentTable(parsedTODO, date) {
    Comment.showCommentsTable(parsedTODO.filter(c => {
        return c.date >= date;
    }));
}

function sortCommentTable(parsedTODO, criterion) {
    if(criterion === "importance") {
        let sorted = parsedTODO.sort((a, b) => {
            if(a.importance < b.importance) {
                return 1;
            }
            if(a.importance > b.importance) {
                return -1;
            }

            return 0;
        });

        Comment.showCommentsTable(sorted);
    }
    else if(criterion === "user") {
        let sorted = parsedTODO.sort((a, b) => {

            if((a.user.length !== 0 && b.user.length !== 0 && a.user.toLowerCase() > b.user.toLowerCase()) ||
                (a.user.length === 0 && b.user.length !== 0)) {
                return 1;
            }

            else if((a.user.length !== 0 && b.user.length !== 0 && a.user.toLowerCase() < b.user.toLowerCase()) ||
                (a.user.length !== 0 && b.user.length === 0)) {
                return -1;
            }

            else {
                return 0;
            }
        });

        Comment.showCommentsTable(sorted);
    }
    else if(criterion === "date") {
        let sorted = parsedTODO.sort((a, b) => {
            if((!isNaN(a.date.valueOf()) && !isNaN(b.date.valueOf()) && a.date > b.date) ||
                (!isNaN(a.date.valueOf()) && isNaN(b.date.valueOf()))) {
                return -1;
            }
            else if ((!isNaN(a.date.valueOf()) && !isNaN(b.date.valueOf()) && a.date < b.date) ||
                (isNaN(a.date.valueOf()) && !isNaN(b.date.valueOf()))) {
                return 1;
            }
            else {
                return 0;
            }
        });

        Comment.showCommentsTable(sorted);
    }
    else {
        console.log(ERROR_MESSAGE);
    }
}

function dateIsCorrect(dateString) {
    let dateTemplate = /\d{1,4}(-\d{1,2}){0,2}/;

    let testDate = new Date(dateString);

    if(testDate instanceof Date && !isNaN(testDate.valueOf())) {
        return (dateString.match(dateTemplate)[0].length === dateString.length);
    }
    else return false;
}

//  todo


// TODO you can do it!

//TODO ff

// TODO dexter;201803; докодить

// TODO mer; 2018-03; сортировать даты
// TODO tyre
// TODO mers;-2018; полежать
// TODO Anonymous;2019;temadat
