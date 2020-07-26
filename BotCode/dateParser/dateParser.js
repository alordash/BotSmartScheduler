const { constants } = require('./constValues');
const { MiscFunctions } = require('./miscFunctions');

async function DefineMinimumTimeValues() {
    for (let [timeType, timeProperty] of Object.entries(this.minTime)) {
        this.minTime[timeType] += await MiscFunctions.GetCurrentTime(timeType, this.ComposedDate);
    }
}

let dateParserConsole = console.log;

function SimplifyAllTwoDotE(text) {
    let newText = '';
    for (let i = 0; i < text.length; i++) {
        if (text[i] == 'ё') {
            newText += 'е';
        } else if (text[i] == 'Ё') {
            newText += 'Е'
        } else {
            newText += text[i];
        }
    }
    return newText;
}

async function SplitSpecialSymbols(words) {
    let res = [];
    for (const word of words) {
        let letters = '';
        let numbers = '';
        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if ((MiscFunctions.IsInteger(char) || MiscFunctions.IsLetter(char)) || MiscFunctions.IsSpecicalChar(char)) {
                letters += char;
                if (numbers.length > 0) {
                    res.push(numbers);
                    numbers = '';
                }
            } else {
                numbers += char;
                if (letters.length > 0) {
                    res.push(letters);
                    letters = '';
                }
            }
        }
        if (letters.length > 0) {
            res.push(letters);
        }
        if (numbers.length > 0) {
            res.push(numbers);
        }
    }
    return res;
}

function ReplaceWordNumbers(words) {
    let result = [];
    let composing = false,
        num = 0,
        prevFoundWord,
        wordNum = 0;
    for (let word of words) {
        let found = false,
            i = 0,
            resultLength = result.length,
            foundWord;
        let isOffsetBeforeHour = false;
        if (resultLength > 2) {
            for (const hourDefiner of constants.integerHoursAdditionalDefiners) {
                if (hourDefiner.needNum) {
                    for (const str of hourDefiner.strings) {
                        if (result[resultLength - 2].toLowerCase().indexOf(str) === 0) {
                            isOffsetBeforeHour = true;
                            break;
                        }
                    }
                }
                if (isOffsetBeforeHour) break;
            }
        }
        while (!found && i < constants.numbersDictionary.length) {
            let numbersDictionaryWord = constants.numbersDictionary[i];
            let j = 0;
            while (!found && j < numbersDictionaryWord.str.length) {
                let fits = false;
                if (numbersDictionaryWord.end) {
                    if (word.length == numbersDictionaryWord.str[j].length) fits = true;
                } else {
                    fits = true;
                }
                if (word.toLowerCase().indexOf(numbersDictionaryWord.str[j]) === 0 && fits) {
                    foundWord = numbersDictionaryWord;
                    found = true;
                }
                j++;
            }
            i++;
        }
        if (found) {
            if (foundWord.multiply) {
                if (composing) {
                    num *= foundWord.val;
                } else {
                    if (typeof (prevFoundWord.val) != 'undefined') {
                        result.splice(result.length - 1, 1);
                        num = prevFoundWord.val * foundWord.val;
                    } else {
                        num = foundWord.val;
                    }
                }
                composing = true;
            } else if (composing) {
                if (foundWord.n <= prevFoundWord.l) {
                    num += foundWord.val;
                } else {
                    if (foundWord.l > 0) {
                        let t = +result[result.length - 1];
                        if (t <= constants.maxHoursPerDay && num <= constants.maxMinutesPerHour && !isOffsetBeforeHour) {
                            result[result.length - 1] = `${t.toString(10)}:${num}`;
                        } else {
                            result.push(num.toString(10));
                        }
                        num = foundWord.val;
                    } else {
                        let t = +result[result.length - 1];
                        if (t <= constants.maxHoursPerDay && num <= constants.maxMinutesPerHour && !isOffsetBeforeHour) {
                            result[result.length - 1] = `${t.toString(10)}:${num}`;
                        } else {
                            result.push(num.toString(10));
                        }
                        result.push(foundWord.val.toString(10));
                        composing = false;
                    }
                }
            } else {
                if (foundWord.l > 0) {
                    num = foundWord.val;
                    composing = true;
                } else {
                    let t = +result[result.length - 1];
                    if (t <= constants.maxHoursPerDay && foundWord.val <= constants.maxMinutesPerHour && !isOffsetBeforeHour) {
                        result[result.length - 1] = `${t.toString(10)}:${foundWord.val}`;
                    } else {
                        result.push(foundWord.val.toString(10));
                    }
                }
            }
        } else {
            if (composing) {
                let t = +result[result.length - 1];
                if (t <= constants.maxHoursPerDay && num <= constants.maxMinutesPerHour && !isOffsetBeforeHour) {
                    result[result.length - 1] = `${t.toString(10)}:${num}`;
                } else {
                    result.push(num.toString(10));
                }
            }
            composing = false;
            result.push(word);
        }
        prevFoundWord = foundWord;
        wordNum++;
    }
    if (composing) {
        let t = +result[result.length - 1];
        if (t <= constants.maxHoursPerDay && num <= constants.maxMinutesPerHour) {
            result[result.length - 1] = `${t.toString(10)}:${num}`;
        } else {
            result.push(num.toString(10));
        }
    }
    dateParserConsole(`Result = ${JSON.stringify(result)}`);
    return result;
}

function FindOffsetLiterals() {
    for (const [timeType, timeVal] of Object.entries(constants.offsetLiterals)) {
        for (const offsetLiteral of timeVal) {
            for (let i = 0; i < this.words.length; i++) {
                if ((this.words[i].toLowerCase() == offsetLiteral.string) && !this.time[timeType].locked) {
                    MiscFunctions.AddWordIndex.call(this, i);
                    this.time[timeType].values.push({ priority: constants.priorityTools.max, word: i, val: MiscFunctions.GetCurrentTime(timeType, this.ComposedDate) + offsetLiteral.offset });
                    this.time[timeType].locked = true;
                    dateParserConsole(`found offsetLiteral "${offsetLiteral.string}" at ${i} \r\nnew timeProperty = ${JSON.stringify(this.time[timeType])}`);
                    return;
                }
            }
        }
    }
}

function FindAdditiveLiterals() {
    let i = -1;
    for (j in this.words) {
        if (this.words[j].toLowerCase() == constants.additiveWord) {
            i = j;
            i = +i;
            break;
        }
    }
    if (i > -1) {
        let lastUsedWordIndex = i;
        let num = 0;
        let foundTimeTypes = [];
        for (let wordIndex = i; wordIndex < this.words.length && wordIndex - lastUsedWordIndex <= 2; wordIndex++) {
            const word = this.words[wordIndex];
            let found = false;
            let prevWordIsNum = false;
            for (const [timeType, timeVal] of Object.entries(constants.additiveLiterals)) {
                for (const additiveLiteral of timeVal) {
                    if (word.toLowerCase().indexOf(additiveLiteral.string) === 0) {
                        if (MiscFunctions.IsInteger(num = this.words[wordIndex - 1])) {
                            num = +num;
                            prevWordIsNum = true;
                        } else {
                            num = 1;
                            prevWordIsNum = false;
                        }
                        if (!additiveLiteral.needNum || (additiveLiteral.needNum && prevWordIsNum)) {
                            dateParserConsole(`Found additiveLiteral "${additiveLiteral.string}" in "${word}", num = "${+num}"`);
                            lastUsedWordIndex = wordIndex;
                            if (!this.time[timeType].locked) {
                                MiscFunctions.AddWordIndex.call(this, i, wordIndex - 1, wordIndex);
                                this.time[timeType].values.push({ priority: constants.priorityTools.max, word: wordIndex, val: MiscFunctions.GetCurrentTime(timeType, this.ComposedDate) + num * additiveLiteral.multiplyer });
                                foundTimeTypes.push(timeType);
                            }
                            //                                this.words[i + j] = this.words[i + 1 + j] = this.words[i + 2 + j] = '';
                        }
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }
        for (let timeType of foundTimeTypes) {
            this.time[timeType].locked = true;
        }
        if (!foundTimeTypes.includes("hours")) {
            this.time.hours.values.push({ priority: 12, word: i, val: MiscFunctions.GetCurrentTime("hours", this.ComposedDate) });
        }
        if(foundTimeTypes.length > 0) {
            this['acceptOffset'] = false;
            return true;
        }
    }
    this['acceptOffset'] = true;
    return false;
}

function FindSimplifiedHour() {
    for (let wordIndex in this.words) {
        wordIndex = +wordIndex;
        let word = this.words[wordIndex];
        if (word.toLowerCase().indexOf(constants.integerWordsTypeDefiners.hours[0].string) === 0) {
            if (wordIndex < this.words.length - 1) {
                let nextWord = this.words[wordIndex + 1];
                let nextWordIsInt = MiscFunctions.IsInteger(nextWord);
                if (wordIndex > 0) {
                    let prevWord = this.words[wordIndex - 1];
                    if (!MiscFunctions.IsInteger(prevWord) && nextWordIsInt) {
                        MiscFunctions.AddWordIndex.call(this, wordIndex);
                        this.time.hours.values.push({ priority: 20, word: wordIndex, val: 1 });
                        this.time.minutes.values.push({ priority: 20, word: wordIndex, val: +nextWord });
                        if (prevWord == 'в') MiscFunctions.AddWordIndex.call(this, wordIndex - 1);
                    }
                } else {
                    if (nextWordIsInt) {
                        MiscFunctions.AddWordIndex.call(this, wordIndex);
                        this.time.hours.values.push({ priority: 15, word: wordIndex, val: 1 });
                        this.time.minutes.values.push({ priority: 15, word: wordIndex, val: +nextWord });
                    }
                }
            }

        }
    }
}

function FindDayOfWeek() {
    let found = false;
    for (let i in this.words) {
        i = +i;
        let word = this.words[i];
        for (const dayOfWeak of constants.daysOfWeak) {
            for (const name of dayOfWeak.names) {
                if (word.toLowerCase().indexOf(name) === 0 && i > 0) {
                    let prevWord = this.words[i - 1].toLowerCase();
                    let hasVerifier = (prevWord.indexOf('на') === 0 || prevWord.indexOf('в') === 0);
                    if (!hasVerifier && i > 1) {
                        let prevPrevWord = this.words[i - 2];
                        hasVerifier = (prevPrevWord.indexOf('на') === 0 || prevPrevWord.indexOf('в') === 0);
                    }
                    if (hasVerifier) {
                        found = true;
                        let weekNumber = 0;
                        if (i < this.words.length - 2) {
                            if (this.words[i + 1].toLowerCase().indexOf('на') === 0 && this.words[i + 2].toLowerCase().indexOf('следу') === 0) {
                                MiscFunctions.AddWordIndex.call(this, i + 1, i + 2);
                                weekNumber++;
                            }
                        }
                        MiscFunctions.AddWordIndex.call(this, i, i - 1);
                        this.time.dates.values.push({ priority: 25, word: i, val: this.ComposedDate.getDate() + MiscFunctions.GetTimeTillDayOfWeek(this.ComposedDate.getDay(), dayOfWeak.number, weekNumber) })
                        this.time.dates.locked = true;
                        let nextTimeType = MiscFunctions.GetNextTimeType('dates');
                        while (nextTimeType != 'minutes') {
                            this.time[nextTimeType].locked = true;
                            dateParserConsole(`locking because of week ${nextTimeType}`);
                            nextTimeType = MiscFunctions.GetNextTimeType(nextTimeType);
                        }
                        break;
                    }
                }
            }
            if (found) break;
        }
        if (found) break;
    }
}

async function IsTime(word) {
    let i = 0;
    let index = -1;
    for (const separator of constants.timeSeparators) {
        if ((index = await word.toLowerCase().indexOf(separator)) > -1) {
            break;
        }
        i++;
    }
    if (index > -1) {
        let hours = word.substring(0, index);
        let minutes = word.substring(index + 1, word.length);
        if (MiscFunctions.IsInteger(hours) && MiscFunctions.IsInteger(minutes)) {
            hours = +hours;
            minutes = +minutes;
            if (hours <= constants.maxHoursPerDay && minutes <= constants.maxMinutesPerHour) {
                return { hours: hours, minutes: minutes };
            }
        }
    }
    return false;
}

async function IsComposedDate(word) {
    let index = await word.toLowerCase().indexOf(constants.dateSeparator);
    let date, month, year;
    if (index > -1) {
        date = await word.substring(0, index);
        word = await word.substring(index + 1, word.length);
        index = await word.toLowerCase().indexOf(constants.dateSeparator);
        if (index > -1) {
            month = await word.substring(0, index);
            year = await word.substring(index + 1, word.length);
        } else {
            month = await word.substring(0, word.length);
        }
        let res = { date: undefined, month: undefined, year: undefined };
        date = +date;
        month = +month;
        year = +year;
        if ((0 < date && date <= constants.maxMonthLength) && (0 < month && month <= constants.maxMonthCount)) {
            res.date = date;
            res.month = month;
            if (this.minTime.years <= year && year <= this.minTime.years + constants.maxYearAddition) {
                res.year = year;
            }
            return res;
        }
    }
    return false;
}

async function IsMonth(word) {
    let res = -1;
    let i = 0;
    for (const month of constants.monthsRusRoot) {
        for (const ending of constants.monthsRusEnding[i]) {
            if (await word.toLowerCase().indexOf(month + ending) > -1) {
                return i + 1;
            }
        }
        i++;
    }
    return -1;
}

async function ParseIntegerWord(index) {
    let parsed = false;
    let word = this.words[index];
    let num = +word;
    const wordsLength = this.words.length;
    if (index < wordsLength - 1) {
        let nextWord = this.words[index + 1];
        for (const [timeType, timeProperty] of Object.entries(constants.integerWordsTypeDefiners)) {
            for (const timeDefiner of timeProperty) {
                if (nextWord.toLowerCase().indexOf(timeDefiner.string) === 0) {
                    dateParserConsole(`Found ${timeType} "${num}" in ${word}`);
                    if (!this.time[timeType].locked) {
                        let prevHourIndex;
                        if (timeType == 'hours' && index < wordsLength - 2) {
                            let nextNextWord = this.words[index + 2];
                            let timeOfDayDefined = false;
                            if (!MiscFunctions.IsInteger(nextNextWord)) {
                                for (const hourTimeOfDayDefiner of constants.hourTimeOfDayDefiners) {
                                    for (const str of hourTimeOfDayDefiner.strings) {
                                        if (nextNextWord.toLowerCase().indexOf(str) === 0) {
                                            timeOfDayDefined = true;
                                            let value = num;
                                            if (value > 12 && hourTimeOfDayDefiner.lesser) {
                                                value -= 12;
                                            } else if (value < 12 && !hourTimeOfDayDefiner.lesser) {
                                                value += 12;
                                            }
                                            this.time.hours.values.push({ priority: 15, word: index, val: value });
                                            if (index > 0 && this.words[index - 1] == 'в') MiscFunctions.AddWordIndex.call(this, index - 1);
                                            MiscFunctions.AddWordIndex.call(this, index, index + 1, index + 2);
                                            break;
                                        }
                                    }
                                    if (timeOfDayDefined) break;
                                }
                            }
                            if (!timeOfDayDefined) {
                                this.time[timeType].values.push({ priority: 10, word: index, val: num });
                            }
                        } else if (timeType == 'minutes' && index < wordsLength - 2 && index > 1 && (prevHourIndex = MiscFunctions.TimeFoundInWord.call(this, 'hours', index - 2)) > -1) {
                            let nextNextWord = this.words[index + 2];
                            let timeOfDayDefined = false;
                            if (!MiscFunctions.IsInteger(nextNextWord)) {
                                for (const hourTimeOfDayDefiner of constants.hourTimeOfDayDefiners) {
                                    for (const str of hourTimeOfDayDefiner.strings) {
                                        if (nextNextWord.toLowerCase().indexOf(str) === 0) {
                                            timeOfDayDefined = true;
                                            let value = this.time.hours.values[prevHourIndex].val;
                                            if (value > 12 && hourTimeOfDayDefiner.lesser) {
                                                value -= 12;
                                            } else if (value < 12 && !hourTimeOfDayDefiner.lesser) {
                                                value += 12;
                                            }
                                            this.time.hours.values[prevHourIndex].val = value;
                                            if (index > 0 && this.words[index - 1] == 'в') MiscFunctions.AddWordIndex.call(this, index - 1);
                                            MiscFunctions.AddWordIndex.call(this, index, index + 1, index + 2);
                                            break;
                                        }
                                    }
                                    if (timeOfDayDefined) break;
                                }
                            }
                            this.time[timeType].values.push({ priority: 10, word: index, val: num });
                        } else {
                            this.time[timeType].values.push({ priority: 10, word: index, val: num });
                        }
                        if (index > 0 && this.words[index - 1] == 'в') MiscFunctions.AddWordIndex.call(this, index - 1);
                        MiscFunctions.AddWordIndex.call(this, index, index + 1);
                        let prevTimeType = MiscFunctions.GetPreviousTimeType(timeType);
                        while (prevTimeType != 'years') {
                            dateParserConsole(`adding ${constants.integerWordsDefaultValues[prevTimeType]} to ${prevTimeType}`);
                            this.time[prevTimeType].values.push({ priority: constants.priorityTools.min, word: index, val: constants.integerWordsDefaultValues[prevTimeType] });
                            prevTimeType = MiscFunctions.GetPreviousTimeType(prevTimeType);
                        }
                    }
                    parsed = true;
                    break;
                }
            }
            if (parsed) break;
        }
    }

    if (!parsed && index > 0 && !this.time.hours.locked) {
        for (const hourDefiner of constants.integerHoursAdditionalDefiners) {
            let prevWord = this.words[index - 1].toLowerCase();
            if (hourDefiner.needNum && index > 1) {
                if (MiscFunctions.IsInteger(prevWord)) {
                    let prevPrevWord = this.words[index - 2].toLowerCase();
                    for (const str of hourDefiner.strings) {
                        if (prevPrevWord.indexOf(str) === 0) {
                            let nextWord = this.words[index + 1];
                            let timeOfDayDefined = false;
                            if (index > 3 && this.words[index - 3] == 'в') {
                                MiscFunctions.AddWordIndex.call(this, index - 3);
                            }
                            if (index < this.words.length - 1 && !MiscFunctions.IsInteger(nextWord)) {
                                for (const hourTimeOfDayDefiner of constants.hourTimeOfDayDefiners) {
                                    for (const str of hourTimeOfDayDefiner.strings) {
                                        if (nextWord.toLowerCase().indexOf(str) === 0) {
                                            timeOfDayDefined = true;
                                            let value = num;
                                            if (value > 12 && hourTimeOfDayDefiner.lesser) {
                                                value -= 12;
                                            } else if (value < 12 && !hourTimeOfDayDefiner.lesser) {
                                                value += 12;
                                            }
                                            this.time.hours.values.push({ priority: 20, word: index, val: value - 1 });
                                            this.time.minutes.values.push({ priority: 20, word: index - 1, val: 60 - +prevWord });
                                            MiscFunctions.AddWordIndex.call(this, index - 2, index - 1, index, index + 1);
                                            break;
                                        }
                                    }
                                    if (timeOfDayDefined) break;
                                }
                            } else {
                                MiscFunctions.AddWordIndex.call(this, index, index - 1, index - 2);
                                this.time.hours.values.push({ priority: 20, word: index, val: num - 1 });
                                this.time.minutes.values.push({ priority: 20, word: index - 1, val: 60 - +prevWord });
                            }
                            parsed = true;
                            break;
                        }
                    }
                }
            } else {
                for (const str of hourDefiner.strings) {
                    if (prevWord.toLowerCase().indexOf(str) === 0) {
                        let nextWord = this.words[index + 1];
                        let timeOfDayDefined = false;
                        if (index < this.words.length - 1 && !MiscFunctions.IsInteger(nextWord)) {
                            for (const hourTimeOfDayDefiner of constants.hourTimeOfDayDefiners) {
                                for (const str of hourTimeOfDayDefiner.strings) {
                                    if (nextWord.toLowerCase().indexOf(str) === 0) {
                                        timeOfDayDefined = true;
                                        let value = num;
                                        if (value > 12 && hourTimeOfDayDefiner.lesser) {
                                            value -= 12;
                                        } else if (value < 12 && !hourTimeOfDayDefiner.lesser) {
                                            value += 12;
                                        }
                                        this.time.hours.values.push({ priority: 20, word: index, val: value - 1 });
                                        this.time.minutes.values.push({ priority: 20, word: index - 1, val: hourDefiner.val });
                                        MiscFunctions.AddWordIndex.call(this, index - 2, index - 1, index, index + 1);
                                        break;
                                    }
                                }
                                if (timeOfDayDefined) break;
                            }
                        } else {
                            MiscFunctions.AddWordIndex.call(this, index, index - 1);
                            this.time.hours.values.push({ priority: 20, word: index, val: num - 1 });
                            this.time.minutes.values.push({ priority: 20, word: index - 1, val: hourDefiner.val });
                        }
                        parsed = true;
                        break;
                    }
                }
            }
            if (parsed) return;
        }
    }
}

async function FillEmptyTimeProperties() {
    for (const [timeType, timeProperty] of Object.entries(this.time)) {
        if (timeProperty.values.length <= 0) {
            await this.time[timeType].values.push({ priority: constants.priorityTools.max, val: this.minTime[timeType] });
            this.time[timeType].locked = true;
        }
    }
    return this;
}

async function FilterTimeProperties() {
    let editedTime = Object.assign({}, this.time);
    for (const [propName, prop] of Object.entries(this.time)) {
        if (prop.values.length === 1 && !prop.locked) {
            // FILTERING UNIC TIME PROPERTIES
            let unicWordIndex = prop.values[0].word;
            //dateParserConsole(`unic word index: ${unicWordIndex}, property: ${propName}`);
            for (const [filteringPropName, filteringProp] of Object.entries(editedTime)) {
                //dateParserConsole(`filteringProp = ${JSON.stringify(filteringProp)}, property: ${filteringPropName}`);
                if (filteringPropName != propName) {
                    let shouldDelete = true;
                    if (filteringPropName == 'hours') {
                        if (propName == 'minutes') shouldDelete = false;
                    } else if (filteringPropName == 'minutes') {
                        if (propName == 'hours') shouldDelete = false;
                    }
                    if (shouldDelete) for (const p in filteringProp.values) {
                        if (filteringProp.values[p].word == unicWordIndex && filteringProp.values.length > 1
                            && !(prop.values[0].type == 'composed' && filteringProp.values[p].type == 'composed')) {
                            //dateParserConsole(`found filteringProp[${p}] = ${JSON.stringify(filteringProp.values[p])}`);
                            await filteringProp.values.splice(p, 1);
                        }
                    }
                }
            }
        } else if (prop.values.length > 1 && !prop.locked) {
            //FILTERING MINIMUM VAL TIME PROPERTIES
            for (let i in prop.values) {
                let timeProp = prop.values[i];
                if (timeProp.priority <= constants.priorityTools.min) prop.values.splice(i, 1);
            }
        }
    }
    return this;
}

function VerifyPropertiesPriority() {
    if (this.time.years.values.length > 1) {
        for (let year of this.time.years.values) {
            if (year.priority < constants.priorityTools.max) {
                if (year.word < this.words.length - 1 && this.words[year.word + 1].toLowerCase().indexOf('год') > -1) {
                    year.priority += constants.priorityTools.increase;
                    MiscFunctions.AddWordIndex.call(this, year.word + 1);
                }
            }
        }
    }
    if (this.time.months.values.length > 1) {
        for (let month of this.time.months.values) {
            if (month.priority < constants.priorityTools.max) {
                if (month.word > 0) {
                    let prevWordIndex = month.word - 1;
                    let i = -1;
                    if (this.words[prevWordIndex].toLowerCase() == 'в') {
                        MiscFunctions.AddWordIndex.call(this, prevWordIndex);
                        month.priority += constants.priorityTools.increase;
                        //THIS IS FOR '12 11.02.2020' CASES
                    } else if (MiscFunctions.IsInteger(this.words[prevWordIndex]) && month.type == 'word' && (i = MiscFunctions.TimeFoundInWord.call(this, 'dates', prevWordIndex)) != -1) {
                        MiscFunctions.AddWordIndex.call(this, prevWordIndex);
                        month.priority += constants.priorityTools.increase;
                        this.time.dates.values[i].priority += constants.priorityTools.increase;
                    }
                }
            }
        }
    }
    for (let i in this.time.hours.values) {
        let hour = this.time.hours.values[i];
        for (let j = 0; j <= 2; j += 2) {
            let minute = MiscFunctions.TimeFoundInWord.call(this, 'minutes', hour.word + j);
            if (hour.word > 0 && hour.priority < constants.priorityTools.max && minute >= 0) {
                minute = this.time.minutes.values[minute];
                if (hour.word > 1 && this.words[hour.word - 1].toLowerCase() == 'в') {
                    MiscFunctions.AddWordIndex.call(this, hour.word - 1);
                    hour.priority += constants.priorityTools.increase;
                    minute.priority += constants.priorityTools.increase;
                }
            }
        }
    }
}

function DetermineTime() {
    let determine = true;
    if (this.time.hours.values.length == 1 && typeof (this.time.hours.values[0].word) == 'undefined') {
        determine = false;
    }
    if (determine) {
        let reversedTimeKeys = Array.prototype.reverse.call(Object.keys(this.time));
        for (const timeType of reversedTimeKeys) {
            let timeProperty = this.time[timeType];
            let value = timeProperty.values[0].val;
            let minValue = this.minTime[timeType];
            if (timeProperty.values.length < 2 && !timeProperty.locked) {
                if (value < minValue || (value <= minValue && (this.shouldIncreaseTime || timeType == 'minutes'))) {
                    if (timeType == 'hours' && value < 12 && value > minValue - 12) {
                        this.shouldIncreaseHours = true;
                        this.shouldIncreaseTime = false;
                    } else {
                        this.shouldIncreaseTime = true;
                    }
                } else {
                    this.shouldIncreaseHours = false;
                    this.shouldIncreaseTime = false;
                }
                this.time[timeType] = value;
            } else if (timeProperty.locked) {
                this.time[timeType] = value;
                if (timeType == 'years') {
                    let newDate = new Date(this.time.years, this.time.months - 1, this.time.dates, this.time.hours, this.time.minutes);
                    if (this.shouldIncreaseTime && newDate.getTime() <= Date.now()) {
                        this.time[timeType]++;
                    }
                } else if (this.shouldIncreaseTime && value <= minValue) {
                    this.time[timeType]++;
                }
                if ((timeType == 'dates' || timeType == 'months' || timeType == 'years') && value > minValue) {
                    this.shouldIncreaseHours = false;
                }
                this.shouldIncreaseTime = false;
            } else {
                let maxPriority = 0;
                let value = 0;
                for (const timeVal of timeProperty.values) {
                    if (timeVal.priority > maxPriority) {
                        maxPriority = timeVal.priority;
                        value = timeVal.val;
                    }
                }
                if (value < minValue) {
                    if (timeType == 'hours' && value < 12 && value >= minValue - 12) {
                        this.shouldIncreaseHours = true;
                        this.shouldIncreaseTime = false;
                    } else {
                        this.shouldIncreaseTime = true;
                    }
                }
                this.time[timeType] = value;
            }
        }
        if (this.shouldIncreaseHours) {
            this.time.hours += 12;
        }
    }
}

function FormText() {
    this.text = '';
    for (let i in this.originalWords) {
        i = +i;
        let word = this.originalWords[i];
        if (!this.usedWords.includes(i)) {
            if (!(MiscFunctions.IsInteger(word) || MiscFunctions.IsLetter(word)))
                this.text += word;
            else this.text += " " + word;
        }
    }
    this.text = this.text.trim();
}

async function ParseDate(text, tsOffset, debug) {
    if (!debug) dateParserConsole = () => { };
    let schedule = new constants.Schedule();
    schedule.ComposedDate = new Date();
    await DefineMinimumTimeValues.call(schedule);
    schedule.text = text;
    schedule.text = SimplifyAllTwoDotE(schedule.text);
    schedule.words = await schedule.text.split(constants.mainSeparators);

    dateParserConsole(`schedule.words = ${JSON.stringify(schedule.words)}`);
    //    schedule.originalWords = schedule.words = await SplitNumbersInWords(schedule.words);
    schedule.originalWords = schedule.words = await SplitSpecialSymbols(schedule.words);
    dateParserConsole(`schedule.originalWords = ${JSON.stringify(schedule.originalWords)}`);

    //    schedule.words = await WordsToLowerCase(schedule.words);
    schedule.words = await ReplaceWordNumbers(schedule.words);
    if (schedule.words.length > constants.MAX_WORDS_COUNT) {
        schedule.words.splice(constants.MAX_WORDS_COUNT, schedule.words.length - constants.MAX_WORDS_COUNT);
    }
    dateParserConsole(`new      words = ${JSON.stringify(schedule.words)}`);
    await FindOffsetLiterals.call(schedule);
    if (!await FindAdditiveLiterals.call(schedule)) {
        await FindSimplifiedHour.call(schedule);
        await FindDayOfWeek.call(schedule);

        let i = 0;
        for (const word of schedule.words) {
            let time, fullDate, month;
            if (!schedule.time.hours.locked && !schedule.time.minutes.locked && (time = await IsTime(word))) {
                //            if (time.hours >= schedule.minTime.hours && time.minutes > schedule.minTime.minutes) {
                MiscFunctions.AddWordIndex.call(schedule, i);
                schedule.time.hours.values.push({ priority: 20, word: i, val: time.hours });
                schedule.time.minutes.values.push({ priority: 20, word: i, val: time.minutes });
                dateParserConsole(`Found time ${time.hours}:${time.minutes} in ${word}`);
                //            }
            }
            if ((!schedule.time.dates.locked || !schedule.time.months.locked || !schedule.time.years.locked) && (fullDate = await IsComposedDate.call(schedule, word))) {
                //            if (fullDate.date >= schedule.minTime.dates && fullDate.month >= schedule.minTime.months && fullDate.year >= schedule.minTime.years) {
                let fullDateAdditionalPriority = 0;
                MiscFunctions.AddWordIndex.call(schedule, i);
                if (typeof (fullDate.year) != 'undefined' && !schedule.time.years.locked) {
                    fullDateAdditionalPriority = constants.priorityTools.min;
                    schedule.time.years.values.push({ priority: 20 + fullDateAdditionalPriority, word: i, val: fullDate.year, type: 'composed' });
                }
                if (!schedule.time.dates.locked) schedule.time.dates.values.push({ priority: 20 + fullDateAdditionalPriority, word: i, val: fullDate.date, type: 'composed' });
                if (!schedule.time.months.locked) schedule.time.months.values.push({ priority: 20 + fullDateAdditionalPriority, word: i, val: fullDate.month, type: 'composed' });
                dateParserConsole(`Found Full Date ${fullDate.date}.${fullDate.month}.${fullDate.year} in ${word}`);
                //            }
            } else if (!schedule.time.months.locked && (month = await IsMonth(word)) > -1) {
                //            if (month >= schedule.minTime.months) {
                MiscFunctions.AddWordIndex.call(schedule, i);
                schedule.time.months.values.push({ priority: 10, word: i, val: month, type: 'word' });
                if (!schedule.time.dates.locked && i > 0) {
                    let prevWord = schedule.words[i - 1];
                    if (MiscFunctions.IsInteger(prevWord)) {
                        MiscFunctions.AddWordIndex.call(schedule, i - 1);
                        prevWord = +prevWord;
                        schedule.time.dates.values.push({ priority: 10, word: i - 1, val: prevWord });
                        dateParserConsole(`Found date from word-Month ${prevWord} in ${word}`);
                    }
                }
                dateParserConsole(`Found word-Month ${constants.monthsRusRoot[month - 1] + constants.monthsRusEnding[month - 1][0]} in ${word}`);
                //            }
            } else if (MiscFunctions.IsInteger(word)) {
                await ParseIntegerWord.call(schedule, i);
            }
            i++;
        }
    }

    await FillEmptyTimeProperties.call(schedule);
    await FilterTimeProperties.call(schedule);
    await VerifyPropertiesPriority.call(schedule);

    let hourOffset = tsOffset / 3600 | 0;
    let minuteOffset = (tsOffset % 3600) / 60;
    if(schedule.acceptOffset) {
        for(let i in schedule.time.hours.values) {
            let hour = schedule.time.hours.values[i];
            hour.val -= hourOffset;
        }
        for(let i in schedule.time.minutes.values) {
            let minute = schedule.time.minutes.values[i];
            minute.val -= minuteOffset;
        }
    }

    dateParserConsole(`schedule.time = ${JSON.stringify(schedule.time)}`);

    await DetermineTime.call(schedule);
    await FormText.call(schedule);

    let answer = '';
    let newDate = new Date(schedule.time.years, schedule.time.months - 1, schedule.time.dates, schedule.time.hours, schedule.time.minutes);
    if (newDate.getTime() > schedule.ComposedDate.getTime() && schedule.text.length) {
        schedule.ComposedDate = newDate;
        answer = `"${schedule.text}": <b>${MiscFunctions.FormDateStringFormat(new Date(schedule.ComposedDate.getTime() + tsOffset * 1000))}</b>`;
        dateParserConsole(`\r\nDetermined schedule: ${JSON.stringify(schedule)}`);
        return { answer: answer, text: schedule.text, date: schedule.ComposedDate };
    } else {
        answer = `Can not schedule for this date`;
        dateParserConsole(`\r\nCan't determine schedule: ${JSON.stringify(schedule)}`);
        return { answer: answer, text: schedule.text };
    }
}

module.exports = { ParseDate };