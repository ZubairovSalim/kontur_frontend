const { getAllFilePathsWithExtension, readFile } = require('./fileSystem');
const { readLine } = require('./console');

const ERROR_MESSAGE = 'wrong command';

app();

function app() {
    const files = getFiles();

    console.log('Please, write your command!');
    readLine(processCommand, files);
}

function getFiles() {
    const filePaths = getAllFilePathsWithExtension(process.cwd(), 'js');
    return filePaths.map(path => {
        return {
            filename: path.split('/')[path.split('/').length - 1],
            file:readFile(path)
        };
    });
}

function processCommand(command, files) {
    let allTODO = findTODO(files);
    let parsedTODO = parseTODO(allTODO);

    //Разбиение введенной команды на 2 части, чтобы в примере: user Anonymous Developer,
    //Anonymous Developer обрабатывалась как одна строка
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
            Comment.showCommentsTable(parsedTODO.filter(c => c.date >= date));
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

/**
 * Находит все необходимые комментарии
 * @param files Массив объектов, содержащих 2 поля: имя исходного файла и считанный файл
 * @returns {Array} Массив объектов, содержащих 2 поля: имя исходного файла и комментарий
 */
function findTODO(files) {
    let mas = [];
    let regex = /\/\/\s*todo(?!\s*:?\s*\n|$)\s*:?\s*(.*)$/igm;

    files.forEach(f => {
        let matches;

        while((matches = regex.exec(f.file)) !== null) {
            mas.push({
                filename: f.filename,
                comment: matches[1]
            });
        }
    });

    return mas;
}

/**
 * Возвращает массив распарсенных комментариев, упакованных в экземпляры класса Comment
 * @param comments Массив исходных комментариев
 * @returns {Array} Массив экземпляров класса Comment
 */
function parseTODO(comments) {
    let parsedComments = [];

    comments.forEach(c => {
        let importance;
        let user = "";
        let date = "";
        let parsedComment = "";
        let filename = c.filename;

        importance = getImportanceLevel(c.comment);

        let arr = c.comment.split(';');

        if(arr.length === 3) {
            user = arr[0].trim();
            date = arr[1].trim();
            parsedComment = arr[2].trim();
        }
        else {
            parsedComment = c.comment;
        }

        //исключаем пустые комментарии
        if(user || date || parsedComment) {
            parsedComments.push(new Comment(importance, user, date, parsedComment, filename));
        }
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

    /**
     * Рассчитывает размеры колонок таблицы и отрисовывает ее
     * @param Comments Массив комментариев
     */
    static showCommentsTable(Comments) {
        const DELIMITERS = 4;
        const INTERNAL_PADDINGS = 20;
        const IMPORTANCE_WIDTH = 1;

        let fields = ["user", "dateStr", "comment", "filename"];
        let minColWidths = [4, 4, 7, 8];
        let maxColWidths = [10, 10, 50, 15];
        let colWidths;
        let spaceCount;

        colWidths = fields.map(field => Math.max.apply(null, Comments.map(c => c[field].length)));

        colWidths = colWidths.map((width, i) => width >= minColWidths[i] && width < maxColWidths[i] ? width :
            width < minColWidths[i] ? minColWidths[i] : maxColWidths[i]);

        spaceCount = colWidths.map((width, i) => (width - minColWidths[i]) > 0 ?
            (width - minColWidths[i]) : 0);

        let allWidth = colWidths.reduce((sum, current) => sum + current, IMPORTANCE_WIDTH + INTERNAL_PADDINGS + DELIMITERS);

        buildTable(Comments, fields, colWidths, spaceCount, allWidth);
    }
}

/**
 * Построение и вывод таблицы с комментариями
 * @param Comments Массив комментариев
 * @param fields Массив с полями таблицы
 * @param colWidths Массив, содержащий размер содержимого колонок
 * @param spaceCount Массив, содержащий отступы колонок
 * @param allWidth Ширина таблицы
 */
function buildTable(Comments, fields, colWidths, spaceCount, allWidth) {
    let header = "  !  |  user" + " ".repeat(spaceCount[0]) + "  |  date" + " ".repeat(spaceCount[1]) +
        "  |  comment" + " ".repeat(spaceCount[2]) + "  |  fileName" + " ".repeat(spaceCount[3]) + "  \n";

    header += "-".repeat(allWidth);

    let content = Comments.reduce((coms, c) => {
        let contentWidths;
        let spaceContentCount;
        let importance = c.importance > 0 ? "!" : " ";

        spaceContentCount = colWidths.map((width, i) => (width - c[fields[i]].length) > 0 ?
            (width - c[fields[i]].length) : 0);
        contentWidths = colWidths.map((width, i) => c[fields[i]].length > width ?
            c[fields[i]].substring(0, width - 3) + "..." : c[fields[i]]);

        return coms + ("  " + importance + "  |  " + contentWidths[0] + " ".repeat(spaceContentCount[0]) + "  |  " +
            contentWidths[1] + " ".repeat(spaceContentCount[1]) + "  |  " + contentWidths[2] +
            " ".repeat(spaceContentCount[2]) + "  |  " + contentWidths[3] + " ".repeat(spaceContentCount[3]) + "  \n");
    }, header + "\n");

    let footer = "-".repeat(allWidth);

    Comments.length !== 0 ? console.log(content + footer) : console.log(content.substring(0, content.length - 1));
}

/**
 * Отображает отсортированную таблицу комментариев по определенному критерию
 * @param parsedTODO Массив комментариев
 * @param criterion Критерий сортировки
 */
function sortCommentTable(parsedTODO, criterion) {
    if(criterion === "importance") {
        let sorted = parsedTODO.slice();
        sorted.sort((a, b) => {
            if(a.importance < b.importance) {
                return 1;
            }
            else if(a.importance > b.importance) {
                return -1;
            }
            return 0;
        });

        Comment.showCommentsTable(sorted);
    }
    else if(criterion === "user") {
        let sorted = parsedTODO.slice();
        sorted.sort((a, b) => {
            if((a.user && b.user && a.user.toLowerCase() > b.user.toLowerCase()) || (!a.user && b.user)) {
                return 1;
            }
            else if((a.user && b.user && a.user.toLowerCase() < b.user.toLowerCase()) || (a.user && !b.user)) {
                return -1;
            }
            return 0;
        });

        Comment.showCommentsTable(sorted);
    }
    else if(criterion === "date") {
        let sorted = parsedTODO.slice();
        sorted.sort((a, b) => {
            let a_date_num = a.date.getTime();
            let b_date_num = b.date.getTime();

            if((!isNaN(a_date_num) && !isNaN(b_date_num) && a.date > b.date) ||
                (!isNaN(a_date_num) && isNaN(b_date_num))) {
                return -1;
            }
            else if ((!isNaN(a_date_num) && !isNaN(b_date_num) && a.date < b.date) ||
                (isNaN(a_date_num) && !isNaN(b_date_num))) {
                return 1;
            }
            return 0;
        });

        Comment.showCommentsTable(sorted);
    }
    else console.log(ERROR_MESSAGE);
}

/**
 * Проверка даты на валидность, для исключения ввода комманд типа: date -2018 или date 201803 и др.
 * @param dateString Строка с датой
 * @returns {boolean} Резльтат проверки: истина или ложь
 */
function dateIsCorrect(dateString) {
    let dateTemplate = /\d{4}(-\d{1,2}){0,2}/;
    let testDate = new Date(dateString);

    if(testDate instanceof Date && !isNaN(testDate.getTime())) {
        let match = dateString.match(dateTemplate);
        return (match !== null && match[0].length === dateString.length);
    }
    else return false;
}

/**
 * Возвращает количество '!' знаков  в комментарии
 * @param comment Комментарий
 * @returns {number} Количество '!' знаков
 */
function getImportanceLevel(comment) {
    let pos = -1;
    let count = 0;

    while ((pos = comment.indexOf("!", pos + 1)) !== -1) count++;

    return count;
}

// todo ;;
//todo
// TODO you can do it!
//TODO ff
// TODO dexter;201803; докодить
// TODO mer; 2018-03; сортировать даты
// TODO tyre
// TODO mers;-2018; полежать
// TODO Anonymous;2019;temadat!!
//todo user 2018; comment
//todo : fox; 2009-02-20; try to use normalizr