var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
// ==UserScript==
// @name          Сбор таможни по всем городам
// @namespace     virtonomica
// @description   Проходит по всем городам и собирает таможенные пошлины по всем товарам включая ИЦ
// @version       1.2
// @include       https://virtonomic*.**/*/main/geo/countrydutylist/*
// @require       https://code.jquery.com/jquery-1.11.1.min.js
// ==/UserScript==
// 
// Набор вспомогательных функций для использования в других проектах. Универсальные
//   /// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
// список типов юнитов. берется по картинке в юните, или с класса i-farm, i-office в списках юнитов
var UnitTypes;
(function (UnitTypes) {
    UnitTypes[UnitTypes["unknown"] = 0] = "unknown";
    UnitTypes[UnitTypes["animalfarm"] = 1] = "animalfarm";
    UnitTypes[UnitTypes["farm"] = 2] = "farm";
    UnitTypes[UnitTypes["lab"] = 3] = "lab";
    UnitTypes[UnitTypes["mill"] = 4] = "mill";
    UnitTypes[UnitTypes["mine"] = 5] = "mine";
    UnitTypes[UnitTypes["office"] = 6] = "office";
    UnitTypes[UnitTypes["oilpump"] = 7] = "oilpump";
    UnitTypes[UnitTypes["orchard"] = 8] = "orchard";
    UnitTypes[UnitTypes["sawmill"] = 9] = "sawmill";
    UnitTypes[UnitTypes["shop"] = 10] = "shop";
    UnitTypes[UnitTypes["seaport"] = 11] = "seaport";
    UnitTypes[UnitTypes["warehouse"] = 12] = "warehouse";
    UnitTypes[UnitTypes["workshop"] = 13] = "workshop";
    UnitTypes[UnitTypes["villa"] = 14] = "villa";
    UnitTypes[UnitTypes["fishingbase"] = 15] = "fishingbase";
    UnitTypes[UnitTypes["service_light"] = 16] = "service_light";
    UnitTypes[UnitTypes["fitness"] = 17] = "fitness";
    UnitTypes[UnitTypes["medicine"] = 18] = "medicine";
    UnitTypes[UnitTypes["restaurant"] = 19] = "restaurant";
    UnitTypes[UnitTypes["laundry"] = 20] = "laundry";
    UnitTypes[UnitTypes["hairdressing"] = 21] = "hairdressing";
    UnitTypes[UnitTypes["power"] = 22] = "power";
    UnitTypes[UnitTypes["coal_power"] = 23] = "coal_power";
    UnitTypes[UnitTypes["incinerator_power"] = 24] = "incinerator_power";
    UnitTypes[UnitTypes["oil_power"] = 25] = "oil_power";
    UnitTypes[UnitTypes["fuel"] = 26] = "fuel";
    UnitTypes[UnitTypes["repair"] = 27] = "repair";
    UnitTypes[UnitTypes["apiary"] = 28] = "apiary";
    UnitTypes[UnitTypes["educational"] = 29] = "educational";
    UnitTypes[UnitTypes["kindergarten"] = 30] = "kindergarten";
    UnitTypes[UnitTypes["sun_power"] = 31] = "sun_power";
    UnitTypes[UnitTypes["network"] = 32] = "network";
    UnitTypes[UnitTypes["it"] = 33] = "it";
    UnitTypes[UnitTypes["cellular"] = 34] = "cellular";
})(UnitTypes || (UnitTypes = {}));
// уровни сервиса
var ServiceLevels;
(function (ServiceLevels) {
    ServiceLevels[ServiceLevels["none"] = -1] = "none";
    ServiceLevels[ServiceLevels["lower"] = 0] = "lower";
    ServiceLevels[ServiceLevels["low"] = 1] = "low";
    ServiceLevels[ServiceLevels["normal"] = 2] = "normal";
    ServiceLevels[ServiceLevels["high"] = 3] = "high";
    ServiceLevels[ServiceLevels["higher"] = 4] = "higher";
    ServiceLevels[ServiceLevels["elite"] = 5] = "elite";
})(ServiceLevels || (ServiceLevels = {}));
/**
 * Простенький конвертер, который из множества формирует массив значений множества. По факту массив чисел.
   используется внутреннее представление множеств и как бы может сломаться в будущем
 * @param enumType тип множества
 */
function enum2Arr(enumType) {
    let res = [];
    for (let key in enumType) {
        if (typeof enumType[key] === "number")
            res.push(enumType[key]);
    }
    return res;
}
/**
 * Простой счетчик. Увеличивается на 1 при каждом вызове метода Next. Нужен для подсчета числа запросов
 */
class Counter {
    constructor() {
        this.Next = () => {
            this._count++;
        };
        this._count = 0;
    }
    ;
    get Count() {
        return this._count;
    }
}
/**
 * Проверяет наличие в словаре ключей. Шорт алиас для удобства.
 * Если словарь не задать, вывалит исключение
 * @param dict проверяемый словарь
 */
function isEmpty(dict) {
    return Object.keys(dict).length === 0; // исключение на null
}
/**
 * Конвертит словарь в простую текстовую строку вида "key:val, key1:val1"
 * значения в строку конвертятся штатным toString()
 * Создана чисто потому что в словарь нельзя засунуть методы.
 * @param dict
 */
function dict2String(dict) {
    if (isEmpty(dict))
        return "";
    let newItems = [];
    for (let key in dict)
        newItems.push(key + ":" + dict[key].toString());
    return newItems.join(", ");
}
/**
 * Фильтрует заданный словарь. Выбирает из него только те элементы которые проходят фильтр.
 * В любом раскладе возвращает пустой словарь
 * @param dict
 * @param selector
 */
function filterDictVal(dict, selector) {
    let res = {};
    for (let key in dict) {
        let item = dict[key];
        if (selector(item))
            res[key] = item;
    }
    return res;
}
/**
 * Склеивает два словаря вместе. Ключи не теряются, если есть одинаковые то вывалит ошибку
 * @param dict1
 * @param dict2
 */
function mergeDict(dict1, dict2) {
    if (dict1 == null || dict2 == null)
        throw new Error("аргументы не должны быть null");
    let res = {};
    for (let key in dict1)
        res[key] = dict1[key];
    for (let key in dict2) {
        if (res[key] != null)
            throw new Error(`dict1 уже имеет такой же ключ '${key}' как и dict2`);
        res[key] = dict2[key];
    }
    return res;
}
function mergeDictN(dict1, dict2) {
    if (dict1 == null || dict2 == null)
        throw new Error("аргументы не должны быть null");
    let res = {};
    for (let key in dict1)
        res[key] = dict1[key];
    for (let key in dict2) {
        if (res[key] != null)
            throw new Error(`dict1 уже имеет такой же ключ '${key}' как и dict2`);
        res[key] = dict2[key];
    }
    return res;
}
/**
 * Проверяет что элемент есть в массиве.
 * @param item
 * @param arr массив НЕ null
 */
function isOneOf(item, arr) {
    if (arr.length <= 0)
        return false;
    return arr.indexOf(item) >= 0;
}
/**
 * Преобразует массив в словарь используя заданные селектор ключа.
 * @param arr
 * @param keySelector
 */
function toDictionaryN(arr, keySelector) {
    let res = {};
    if (!arr)
        throw new Error("arr null");
    if (!keySelector)
        throw new Error("keySelector null");
    for (let el of arr) {
        let k = keySelector(el);
        if (!k)
            throw new Error("Ключ не может быть неопределен!");
        if (res[k])
            throw new Error("Обнаружено повторение ключа!");
        res[k] = el;
    }
    return res;
}
/**
 * Возвращает только уникальные значения массива. Для объектов идет сравнение ссылок, само содержимое не сравнивается
 * @param array
 */
function unique(array) {
    let res = [];
    for (let i = 0; i < array.length; i++) {
        let item = array[i];
        if (array.indexOf(item) === i)
            res.push(item);
    }
    return res;
}
/**
 * Находит пересечение двух массивов. Объекты сравнивать будет по ссылкам. Дубли удаляются.
 * Возвращает массив уникальных значений имеющихся в обоих массивах
 * @param a
 * @param b
 */
function intersect(a, b) {
    // чтобы быстрее бегал indexOf в A кладем более длинный массив
    if (b.length > a.length) {
        let t = b;
        b = a;
        a = t;
    }
    // находим пересечение с дублями
    let intersect = [];
    for (let item of a) {
        if (b.indexOf(item) >= 0)
            intersect.push(item);
    }
    // если надо удалить дубли, удаляем
    return unique(intersect);
}
// NUMBER ------------------------------------------
/**
 * round до заданного числа знаков. Может дать погрешность на округлении но похрен
 * @param n
 * @param decimals
 */
function roundTo(n, decimals) {
    if (isNaN(n) || isNaN(decimals))
        throw new Error(`числа должны быть заданы. n:${n}, decimals:${decimals}`);
    if (decimals < 0)
        throw new Error(`decimals: ${decimals} не может быть меньше 0`);
    decimals = Math.round(decimals); // делаем ставку на косяки округления откуда может прилететь 1.00000001
    let f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
}
/**
 * floor до заданного числа знаков. Может дать погрешность если будет число вида x.99999999999
   так как при расчетах прибавляет 1е-10. Но это очень редкий случай когда округлит вверх
 * @param n
 * @param decimals
 */
function floorTo(n, decimals) {
    if (isNaN(n) || isNaN(decimals))
        throw new Error(`числа должны быть заданы. n:${n}, decimals:${decimals}`);
    if (decimals < 0)
        throw new Error(`decimals: ${decimals} не может быть меньше 0`);
    decimals = Math.round(decimals); // делаем ставку на косяки округления откуда может прилететь 1.00000001
    let f = Math.pow(10, decimals);
    return Math.floor(n * f + 1e-10) / f;
}
/**
 * ceil до заданного числа знаков. Может дать погрешность если будет число вида x.00000000000001
   так как при расчетах вычитает 1е-10. Но это очень редкий случай когда округлит вверх
 * @param n
 * @param decimals
 */
function ceilTo(n, decimals) {
    if (isNaN(n) || isNaN(decimals))
        throw new Error(`числа должны быть заданы. n:${n}, decimals:${decimals}`);
    if (decimals < 0)
        throw new Error(`decimals: ${decimals} не может быть меньше 0`);
    decimals = Math.round(decimals); // делаем ставку на косяки округления откуда может прилететь 1.00000001
    let f = Math.pow(10, decimals);
    return Math.ceil(n * f - 1e-10) / f;
}
// PARSE -------------------------------------------
/**
 * удаляет из строки все денежные и специальные символы типо процента и пробелы между цифрами
 * @param str
 */
function cleanStr(str) {
    return str.replace(/[\s\$\%\©]/g, "");
}
/**
 * Выдергивает реалм из текущего href ссылки если это возможно.
 */
function getRealm() {
    // https://*virtonomic*.*/*/main/globalreport/marketing/by_trade_at_cities/*
    // https://*virtonomic*.*/*/window/globalreport/marketing/by_trade_at_cities/*
    let rx = new RegExp(/https:\/\/virtonomic[A-Za-z]+\.[a-zA-Z]+\/([a-zA-Z]+)\/.+/ig);
    let m = rx.exec(document.location.href);
    if (m == null)
        return null;
    return m[1];
}
function getRealmOrError() {
    let realm = getRealm();
    if (realm === null)
        throw new Error("Не смог определить реалм по ссылке " + document.location.href);
    return realm;
}
/**
 * Парсит id компании со страницы и выдает ошибку если не может спарсить
 */
function getCompanyId() {
    let str = matchedOrError($("a.dashboard").attr("href"), /\d+/);
    return numberfyOrError(str);
}
/**
 * Оцифровывает строку. Возвращает всегда либо число или Number.POSITIVE_INFINITY либо -1 если str не содержит числа.
 * @param variable любая строка.
 */
function numberfy(str) {
    // возвращает либо число полученно из строки, либо БЕСКОНЕЧНОСТЬ, либо -1 если не получилось преобразовать.
    if (String(str) === 'Не огр.' ||
        String(str) === 'Unlim.' ||
        String(str) === 'Не обм.' ||
        String(str) === 'N’est pas limité' ||
        String(str) === 'No limitado' ||
        String(str) === '无限' ||
        String(str) === 'Nicht beschr.') {
        return Number.POSITIVE_INFINITY;
    }
    else {
        // если str будет undef null или что то страшное, то String() превратит в строку после чего парсинг даст NaN
        // не будет эксепшнов
        let n = parseFloat(cleanStr(String(str)));
        return isNaN(n) ? -1 : n;
    }
}
/**
 * Пробуем оцифровать данные но если они выходят как Number.POSITIVE_INFINITY или <= minVal, валит ошибку.
   смысл в быстром вываливании ошибки если парсинг текста должен дать число
   Нужно понимать что если оцифровка не удалась, то получится -1 и при minVal=0 выдаст ошибку конечно
 * @param value строка являющая собой число больше minVal
 * @param minVal ограничение снизу. Число.
 * @param infinity разрешена ли бесконечность
 */
function numberfyOrError(str, minVal = 0, infinity = false) {
    let n = numberfy(str);
    if (!infinity && (n === Number.POSITIVE_INFINITY || n === Number.NEGATIVE_INFINITY))
        throw new RangeError("Получили бесконечность, что запрещено.");
    if (n <= minVal)
        throw new RangeError("Число должно быть > " + minVal);
    return n;
}
/**
 * Ищет паттерн в строке. Предполагая что паттерн там обязательно есть 1 раз. Если
 * нет или случился больше раз, валим ошибку
 * @param str строка в которой ищем
 * @param rx паттерн который ищем
 */
function matchedOrError(str, rx, errMsg) {
    let m = str.match(rx);
    if (m == null)
        throw new Error(errMsg || `Паттерн ${rx} не найден в ${str}`);
    if (m.length > 1)
        throw new Error(errMsg || `Паттерн ${rx} найден в ${str} ${m.length} раз вместо ожидаемого 1`);
    return m[0];
}
/**
 * Пробуем прогнать регулярное выражение на строку, если не прошло, то вывалит ошибку.
 * иначе вернет массив. 0 элемент это найденная подстрока, остальные это найденные группы ()
 * @param str
 * @param rx
 * @param errMsg
 */
function execOrError(str, rx, errMsg) {
    let m = rx.exec(str);
    if (m == null)
        throw new Error(errMsg || `Паттерн ${rx} не найден в ${str}`);
    return m;
}
/**
 * из строки пробует извлечь все вещественные числа. Рекомендуется применять ТОЛЬКО для извлечения из текстовых строк.
 * для простого парсинга числа пойдет numberfy
 * Если их нет вернет null
 * @param str
 */
function extractFloatPositive(str) {
    let m = cleanStr(str).match(/\d+\.\d+/ig);
    if (m == null)
        return null;
    let n = m.map((val, i, arr) => numberfyOrError(val, -1));
    return n;
}
/**
 * из указанной строки, извлекает числа. обычно это id юнита товара и так далее
 * @param str
 */
function extractIntPositive(str) {
    let m = cleanStr(str).match(/\d+/ig);
    if (m == null)
        return null;
    let n = m.map((val, i, arr) => numberfyOrError(val, -1));
    return n;
}
/**
 * По текстовой строке возвращает номер месяца начиная с 0 для января. Либо null
 * @param str очищенная от пробелов и лишних символов строка
 */
function monthFromStr(str) {
    let mnth = ["январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];
    for (let i = 0; i < mnth.length; i++) {
        if (str.indexOf(mnth[i]) === 0)
            return i;
    }
    return null;
}
/**
 * По типовой игровой строке даты вида 10 января 55 г., 3 февраля 2017 - 22.10.12
 * выдергивает именно дату и возвращает в виде объекта даты
 * @param str
 */
function extractDate(str) {
    let dateRx = /^(\d{1,2})\s+([а-я]+)\s+(\d{1,4})/i;
    let m = dateRx.exec(str);
    if (m == null)
        return null;
    let d = parseInt(m[1]);
    let mon = monthFromStr(m[2]);
    if (mon == null)
        return null;
    let y = parseInt(m[3]);
    return new Date(y, mon, d);
}
function extractDateOrError(str) {
    let dt = extractDate(str);
    if (dt == null)
        throw new Error(`Не получилось извлечь дату из "${str}"`);
    return dt;
}
/**
 * из даты формирует короткую строку типа 01.12.2017
 * @param date
 */
function dateToShort(date) {
    let d = date.getDate();
    let m = date.getMonth() + 1;
    let yyyy = date.getFullYear();
    let dStr = d < 10 ? "0" + d : d.toString();
    let mStr = m < 10 ? "0" + m : m.toString();
    return `${dStr}.${mStr}.${yyyy}`;
}
/**
 * из строки вида 01.12.2017 формирует дату
 * @param str
 */
function dateFromShort(str) {
    let items = str.split(".");
    let d = parseInt(items[0]);
    if (d <= 0)
        throw new Error("дата неправильная.");
    let m = parseInt(items[1]) - 1;
    if (m < 0)
        throw new Error("месяц неправильная.");
    let y = parseInt(items[2]);
    if (y < 0)
        throw new Error("год неправильная.");
    return new Date(y, m, d);
}
/**
 * По заданному числу возвращает число с разделителями пробелами для удобства чтения
 * @param num
 */
function sayNumber(num) {
    if (num < 0)
        return "-" + sayNumber(-num);
    if (Math.round(num * 100) / 100 - Math.round(num))
        num = Math.round(num * 100) / 100;
    else
        num = Math.round(num);
    let s = num.toString();
    let s1 = "";
    let l = s.length;
    let p = s.indexOf(".");
    if (p > -1) {
        s1 = s.substr(p);
        l = p;
    }
    else {
        p = s.indexOf(",");
        if (p > -1) {
            s1 = s.substr(p);
            l = p;
        }
    }
    p = l - 3;
    while (p >= 0) {
        s1 = ' ' + s.substr(p, 3) + s1;
        p -= 3;
    }
    if (p > -3) {
        s1 = s.substr(0, 3 + p) + s1;
    }
    if (s1.substr(0, 1) == " ") {
        s1 = s1.substr(1);
    }
    return s1;
}
/**
 * Для денег подставляет нужный символ при выводе на экран. Округляет до 2 знаков,
   так же вставляет пробелы как разделитель для тысяч
 * @param num
 * @param symbol
 */
function sayMoney(num, symbol = "$") {
    let result = sayNumber(num);
    if (symbol != null) {
        if (num < 0)
            result = '-' + symbol + sayNumber(Math.abs(num));
        else
            result = symbol + result;
    }
    return result;
}
/**
 * Пробует взять со страницы картинку юнита и спарсить тип юнита
 * Пример сорса /img/v2/units/shop_1.gif  будет тип shop.
 * Он кореллирует четко с i-shop в списке юнитов
 * Если картинки на странице нет, то вернет null. Сам разбирайся почему ее там нет
 * @param $html
 */
function getUnitType($html) {
    let $div = $html.find("#unitImage");
    if ($div.length === 0)
        return null;
    let src = $div.find("img").attr("src");
    let items = src.split("/");
    if (items.length < 2)
        throw new Error("Что то не так с урлом картинки " + src);
    let typeStr = items[items.length - 1].split("_")[0];
    let type = UnitTypes[typeStr] ? UnitTypes[typeStr] : UnitTypes.unknown;
    if (type == UnitTypes.unknown)
        throw new Error("Не описан тип юнита " + typeStr);
    return type;
}
/**
 * Форматирует строки в соответствии с форматом в C#. Плейсхолдеры {0}, {1} заменяет на аргументы.
   если аргумента НЕТ а плейсхолдер есть, вывалит исключение, как и в сишарпе.
 * @param str шаблон строки
 * @param args аргументы которые подставить
 */
function formatStr(str, ...args) {
    let res = str.replace(/{(\d+)}/g, (match, number) => {
        if (args[number] == null)
            throw new Error(`плейсхолдер ${number} не имеет значения`);
        return args[number];
    });
    return res;
}
/**
 * если значение null то вывалит ошибку, иначе вернет само значение. Короткий метод для проверок на нулл
 * @param val
 */
function nullCheck(val) {
    if (val == null)
        throw new Error(`nullCheck Error`);
    return val;
}
// РЕГУЛЯРКИ ДЛЯ ССЫЛОК ------------------------------------
// для 1 юнита
// 
let url_unit_rx = /\/[a-z]+\/(?:main|window)\/unit\/view\/\d+/i; // внутри юнита. любая страница
let url_unit_main_rx = /\/\w+\/(?:main|window)\/unit\/view\/\d+\/?$/i; // главная юнита
let url_unit_finance_report = /\/[a-z]+\/main\/unit\/view\/\d+\/finans_report(\/graphical)?$/i; // финанс отчет
let url_trade_hall_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/trading_hall\/?/i; // торговый зал
let url_price_history_rx = /\/[a-z]+\/(?:main|window)\/unit\/view\/\d+\/product_history\/\d+\/?/i; // история продаж в магазине по товару
let url_supply_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/supply\/?/i; // снабжение
let url_sale_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/sale\/?/i; // продажа склад/завод
let url_ads_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/virtasement$/i; // реклама
let url_education_rx = /\/[a-z]+\/window\/unit\/employees\/education\/\d+\/?/i; // обучение
let url_supply_create_rx = /\/[a-z]+\/unit\/supply\/create\/\d+\/step2\/?$/i; // заказ товара в маг, или склад. в общем стандартный заказ товара
let url_equipment_rx = /\/[a-z]+\/window\/unit\/equipment\/\d+\/?$/i; // заказ оборудования на завод, лабу или куда то еще
// для компании
// 
let url_unit_list_rx = /\/[a-z]+\/(?:main|window)\/company\/view\/\d+(\/unit_list)?(\/xiooverview|\/overview)?$/i; // список юнитов. Работает и для списка юнитов чужой компании
let url_rep_finance_byunit = /\/[a-z]+\/main\/company\/view\/\d+\/finance_report\/by_units(?:\/.*)?$/i; // отчет по подразделениями из отчетов
let url_rep_ad = /\/[a-z]+\/main\/company\/view\/\d+\/marketing_report\/by_advertising_program$/i; // отчет по рекламным акциям
let url_manag_equip_rx = /\/[a-z]+\/window\/management_units\/equipment\/(?:buy|repair)$/i; // в окне управления юнитами групповой ремонт или закупка оборудования
let url_manag_empl_rx = /\/[a-z]+\/main\/company\/view\/\d+\/unit_list\/employee\/?$/i; // управление - персонал
// для для виртономики
// 
let url_global_products_rx = /[a-z]+\/main\/globalreport\/marketing\/by_products\/\d+\/?$/i; // глобальный отчет по продукции из аналитики
let url_products_rx = /\/[a-z]+\/main\/common\/main_page\/game_info\/products$/i; // страница со всеми товарами игры
let url_trade_products_rx = /\/[a-z]+\/main\/common\/main_page\/game_info\/trading$/i; // страница с торгуемыми товарами
let url_city_retail_report_rx = /\/[a-z]+\/(?:main|window)\/globalreport\/marketing\/by_trade_at_cities\/\d+/i; // розничный отчет по конкретному товару
let url_products_size_rx = /\/[a-z]+\/main\/industry\/unit_type\/info\/2011\/volume\/?/i; // размеры продуктов на склада
let url_country_duties_rx = /\/[a-z]+\/main\/geo\/countrydutylist\/\d+\/?/i; // таможенные пошлины и ИЦ
let url_tm_info_rx = /\/[a-z]+\/main\/globalreport\/tm\/info/i; // брендовые товары список
/**
 * По заданной ссылке и хтмл определяет находимся ли мы внутри юнита или нет.
 * Если на задавать ссылку и хтмл то берет текущий документ.
 * Вызов без параметров приводит к определению находимся ли мы своем юните сейчас
 * @param urlPath
 * @param $html
 * @param my своя компания или нет?
 */
function isUnit(urlPath, $html, my = true) {
    if (!urlPath || !$html) {
        urlPath = document.location.pathname;
        $html = $(document);
    }
    // для ситуации когда мы внутри юнита характерно что всегда ссылка вида 
    // https://virtonomica.ru/olga/main/unit/view/6452212/*
    let urlOk = url_unit_rx.test(urlPath);
    if (!urlOk)
        return false;
    // но у своего юнита ссыль на офис имеет тот же айди что и ссыль на дашборду. А для чужого нет
    let urlOffice = $html.find("div.officePlace a").attr("href");
    let urlDash = $html.find("a.dashboard").attr("href");
    if (urlOffice.length === 0 || urlDash.length === 0)
        throw new Error("Ссылка на офис или дашборду не может быть найдена");
    let isMy = (`${urlOffice}/dashboard` === urlDash);
    return my ? isMy : !isMy;
}
/**
 * Проверяет что мы именно на своей странице со списком юнитов. По ссылке и id компании
 * Проверок по контенту не проводит.
 */
function isMyUnitList() {
    // для своих и чужих компани ссылка одна, поэтому проверяется и id
    if (url_unit_list_rx.test(document.location.pathname) === false)
        return false;
    // запрос id может вернуть ошибку если мы на window ссылке. значит точно у чужого васи
    try {
        let id = getCompanyId();
        let urlId = extractIntPositive(document.location.pathname); // полюбому число есть иначе регекс не пройдет
        if (urlId[0] != id)
            return false;
    }
    catch (err) {
        return false;
    }
    return true;
}
/**
 * Проверяет что мы именно на чужой!! странице со списком юнитов. По ссылке.
 * Проверок по контенту не проводит.
 */
function isOthersUnitList() {
    // для своих и чужих компани ссылка одна, поэтому проверяется и id
    if (url_unit_list_rx.test(document.location.pathname) === false)
        return false;
    try {
        // для чужого списка будет разный айди в дашборде и в ссылке
        let id = getCompanyId();
        let urlId = extractIntPositive(document.location.pathname); // полюбому число есть иначе регекс не пройдет
        if (urlId[0] === id)
            return false;
    }
    catch (err) {
        // походу мы на чужом window списке. значит ок
        return true;
    }
    return true;
}
function isUnitMain(urlPath, html, my = true) {
    let ok = url_unit_main_rx.test(urlPath);
    if (!ok)
        return false;
    let hasTabs = $(html).find("ul.tabu").length > 0;
    if (my)
        return hasTabs;
    else
        return !hasTabs;
}
//function isOthersUnitMain() {
//    // проверим линк и затем наличие табулятора. Если он есть то свой юнит, иначе чужой
//    let ok = url_unit_main_rx.test(document.location.pathname);
//    if (ok)
//        ok = $("ul.tabu").length === 0;
//    return ok;
//}
function isUnitFinanceReport() {
    return url_unit_finance_report.test(document.location.pathname);
}
function isCompanyRepByUnit() {
    return url_rep_finance_byunit.test(document.location.pathname);
}
/**
 * Возвращает Истину если данная страница есть страница в магазине своем или чужом. Иначе Ложь
 * @param html полностью страница
 * @param my свой юнит или чужой
 */
function isShop(html, my = true) {
    let $html = $(html);
    // нет разницы наш или чужой юнит везде картинка мага нужна. ее нет только если window
    let $img = $html.find("#unitImage img[src*='/shop_']");
    if ($img.length > 1)
        throw new Error(`Найдено несколько (${$img.length}) картинок Магазина.`);
    return $img.length > 0;
}
function isWarehouse($html) {
    // нет разницы наш или чужой юнит везде картинка мага нужна. ее нет только если window
    let $img = $html.find("#unitImage img[src*='/warehouse_']");
    if ($img.length > 1)
        throw new Error(`Найдено несколько (${$img.length}) картинок Склада.`);
    return $img.length > 0;
}
/**
 * Возвращает Истину если данная страница есть страница в заправке своей или чужой. Иначе Ложь
 * @param html полностью страница
 * @param my свой юнит или чужой
 */
function isFuel(html, my = true) {
    let $html = $(html);
    // нет разницы наш или чужой юнит везде картинка мага нужна
    let $img = $html.find("#unitImage img[src*='/fuel_']");
    if ($img.length > 1)
        throw new Error(`Найдено несколько (${$img.length}) картинок Магазина.`);
    return $img.length > 0;
}
function hasTradeHall(html, my = true) {
    let $html = $(html);
    if (my) {
        let $a = $html.find("ul.tabu a[href$=trading_hall]");
        if ($a.length > 1)
            throw new Error("Найдено больше одной ссылки на трейдхолл.");
        return $a.length === 1;
    }
    else
        return false;
}
// let url_visitors_history_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/visitors_history\/?/i;
//function isVisitorsHistory() {
//    return url_visitors_history_rx.test(document.location.pathname);
//}
// JQUERY ----------------------------------------
/**
 * Возвращает ближайшего родителя по имени Тэга
   работает как и closest. Если родитель не найден то не возвращает ничего для данного элемента
    то есть есть шанс что было 10 а родителей нашли 4 и их вернули.
 * @param items набор элементов JQuery
 * @param tagname имя тэга. tr, td, span и так далее
 */
function closestByTagName(items, tagname) {
    let tag = tagname.toUpperCase();
    let found = [];
    for (let i = 0; i < items.length; i++) {
        let node = items[i];
        while ((node = node.parentNode) && node.nodeName != tag) { }
        ;
        if (node)
            found.push(node);
    }
    return $(found);
}
/**
 * Для заданного элемента, находит все непосредственно расположенные в нем текстовые ноды и возвращает их текст.
   очень удобен для извлечения непосредственного текста из тэга БЕЗ текста дочерних нодов
 * @param item 1 объект типа JQuery
 */
function getOnlyText(item) {
    // просто children() не отдает текстовые ноды.
    let $childrenNodes = item.contents();
    let res = [];
    for (let i = 0; i < $childrenNodes.length; i++) {
        let el = $childrenNodes.get(i);
        if (el.nodeType === 3)
            res.push($(el).text()); // так как в разных браузерах текст запрашивается по разному, 
    }
    return res;
}
/**
 * Пробует найти ровно 1 элемент для заданного селектора. если не нашло или нашло больше валит ошибку
 * @param $item
 * @param selector
 */
function oneOrError($item, selector) {
    let $one = $item.find(selector);
    if ($one.length != 1)
        throw new Error(`Найдено ${$one.length} элементов вместо 1 для селектора ${selector}`);
    return $one;
}
// AJAX ----------------------------------------
/**
 * Отправляет запрос на установку нужной пагинации. Возвращает promice дальше делай с ним что надо.
 */
function doRepage(pages, $html) {
    // если не задать данные страницы, то считаем что надо использовать текущую
    if ($html == null)
        $html = $(document);
    // снизу всегда несколько кнопок для числа страниц, НО одна может быть уже нажата мы не знаем какая
    // берем просто любую ненажатую, извлекаем ее текст, на у далее в ссылке всегда
    // есть число такое же как текст в кнопке. Заменяем на свое и все ок.
    let $pager = $html.find('ul.pager_options li').has("a").last();
    let num = $pager.text().trim();
    let pagerUrl = $pager.find('a').attr('href').replace(num, pages.toString());
    // запросили обновление пагинации, дальше юзер решает что ему делать с этим
    let deffered = $.Deferred();
    $.get(pagerUrl)
        .done((data, status, jqXHR) => deffered.resolve(data))
        .fail((err) => deffered.reject("Не удалось установить пагинацию => " + err));
    return deffered.promise();
}
/**
 * Загружается указанную страницу используя заданное число повторов и таймаут. Так же можно задать
 * нужно ли убирать пагинацию или нет. Если нужно, то функция вернет страничку БЕЗ пагинации
 * @param url
 * @param retries число попыток
 * @param timeout
 * @param repage нужно ли убирать пагинацию
 */
function getPage(url, retries = 10, timeout = 1000, repage = true) {
    let deffered = $.Deferred();
    // сначала запросим саму страницу с перезапросом по ошибке
    tryGet(url, retries, timeout)
        .then((html) => {
        let locdef = $.Deferred();
        if (html == null) {
            locdef.reject("неизвестная ошибка. страница пришла пустая " + url);
            return locdef.promise();
        }
        // если страниц нет, то как бы не надо ничо репейджить
        // если не надо репейджить то тоже не будем
        let $html = $(html);
        if (!repage || !hasPages($html)) {
            deffered.resolve(html);
        }
        else {
            // репейджим
            let purl = getRepageUrl($html, 10000);
            if (purl == null)
                locdef.reject("не смог вытащить урл репейджа хотя он там должен быть");
            else
                locdef.resolve(purl);
        }
        return locdef.promise();
    }) // если нет репейджа все закончится тут
        .then((purl) => {
        let locdef = $.Deferred();
        tryGet(purl, retries, timeout)
            .done(() => locdef.resolve())
            .fail((err) => locdef.reject("ошибка репейджа => " + err));
        return locdef.promise();
    }) // запросим установку репейджа
        .then(() => tryGet(url, retries, timeout)) // снова запросим страницу
        .then((html) => deffered.resolve(html))
        .fail((err) => deffered.reject(err));
    return deffered.promise();
}
/**
 * Запрашивает страницу. При ошибке поробует повторить запрос через заданное число секунд.
 * Пробует заданное число попыток, после чего возвращает reject
 * @param url
 * @param retries число попыток загрузки
 * @param timeout таймаут между попытками
 */
function tryGet(url, retries = 10, timeout = 1000) {
    let $deffered = $.Deferred();
    $deffered.notify("0: " + url); // сразу даем уведомление, это работает. НО только 1 сработает если вызвать ДО установки прогресс хендлера на промис
    $.ajax({
        url: url,
        type: "GET",
        success: (data, status, jqXHR) => $deffered.resolve(data),
        error: function (jqXHR, textStatus, errorThrown) {
            retries--;
            if (retries <= 0) {
                $deffered.reject("Не смог загрузить страницу " + this.url);
                return;
            }
            logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
            let _this = this;
            setTimeout(() => {
                $deffered.notify("0: " + url); // уведомляем об очередном запросе
                $.ajax(_this);
            }, timeout);
        }
    });
    return $deffered.promise();
}
/**
 * Запрашивает страницу. При ошибке поробует повторить запрос через заданное число секунд.
 * Пробует заданное число попыток, после чего возвращает reject.
 * При ресолве вернет текст страницы, а при реджекте вернет Error объект
 * @param url
 * @param retries число попыток загрузки
 * @param timeout таймаут между попытками
 * @param beforeGet вызывается перед каждым новым запросом. То есть число вызовов равно числу запросов. Каждый раз вызывается с урлом которые запрашивается.
 */
function tryGet_async(url, retries = 10, timeout = 1000, beforeGet, onError) {
    return __awaiter(this, void 0, void 0, function* () {
        //logDebug(`tryGet_async: ${url}`);
        // сам метод пришлось делать Promise<any> потому что string | Error не работало какого то хуя не знаю. Из за стрик нулл чек
        let $deffered = $.Deferred();
        if (beforeGet) {
            try {
                beforeGet(url);
            }
            catch (err) {
                logDebug("beforeGet вызвал исключение", err);
            }
        }
        $.ajax({
            url: url,
            type: "GET",
            success: (data, status, jqXHR) => $deffered.resolve(data),
            error: function (jqXHR, textStatus, errorThrown) {
                if (onError) {
                    try {
                        onError(url);
                    }
                    catch (err) {
                        logDebug("onError вызвал исключение", err);
                    }
                }
                retries--;
                if (retries <= 0) {
                    let err = new Error(`can't get ${this.url}\nstatus: ${jqXHR.status}\ntextStatus: ${jqXHR.statusText}\nerror: ${errorThrown}`);
                    $deffered.reject(err);
                    return;
                }
                //logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
                let _this = this;
                setTimeout(() => {
                    if (beforeGet) {
                        try {
                            beforeGet(url);
                        }
                        catch (err) {
                            logDebug("beforeGet вызвал исключение", err);
                        }
                    }
                    $.ajax(_this);
                }, timeout);
            }
        });
        return $deffered.promise();
    });
}
/**
 * Отправляет данные на сервер запросом POST. В остальном работает как и гет. Так же вернет промис который ресолвит с возвращенными данными
 * @param url
 * @param form данные для отправки на сервер
 * @param retries
 * @param timeout
 * @param beforePost
 */
function tryPost_async(url, form, retries = 10, timeout = 1000, beforePost, onError) {
    return __awaiter(this, void 0, void 0, function* () {
        // сам метод пришлось делать Promise<any> потому что string | Error не работало какого то хуя не знаю. Из за стрик нулл чек
        let $deferred = $.Deferred();
        if (beforePost) {
            try {
                beforePost(url);
            }
            catch (err) {
                logDebug("beforePost вызвал исключение", err);
            }
        }
        $.ajax({
            url: url,
            data: form,
            type: "POST",
            success: (data, status, jqXHR) => $deferred.resolve(data),
            error: function (jqXHR, textStatus, errorThrown) {
                if (onError) {
                    try {
                        onError(url);
                    }
                    catch (err) {
                        logDebug("onError вызвал исключение", err);
                    }
                }
                retries--;
                if (retries <= 0) {
                    let err = new Error(`can't post ${this.url}\nstatus: ${jqXHR.status}\ntextStatus: ${jqXHR.statusText}\nerror: ${errorThrown}`);
                    $deferred.reject(err);
                    return;
                }
                //logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
                let _this = this;
                setTimeout(() => {
                    if (beforePost) {
                        try {
                            beforePost(url);
                        }
                        catch (err) {
                            logDebug("beforePost вызвал исключение", err);
                        }
                    }
                    $.ajax(_this);
                }, timeout);
            }
        });
        return $deferred.promise();
    });
}
/**
 * Отправляет данные на сервер запросом POST. В остальном работает как и гет. Так же вернет промис который ресолвит с возвращенными данными
 * @param url
 * @param data данные для отправки на сервер
 * @param retries
 * @param timeout
 * @param beforePost
 */
function tryPostJSON_async(url, data, retries = 10, timeout = 1000, beforePost, onError) {
    return __awaiter(this, void 0, void 0, function* () {
        // сам метод пришлось делать Promise<any> потому что string | Error не работало какого то хуя не знаю. Из за стрик нулл чек
        let $deferred = $.Deferred();
        if (beforePost) {
            try {
                beforePost(url);
            }
            catch (err) {
                logDebug("beforePost вызвал исключение", err);
            }
        }
        $.ajax({
            url: url,
            data: data,
            type: "POST",
            dataType: 'JSON',
            success: (data, status, jqXHR) => $deferred.resolve(data),
            error: function (jqXHR, textStatus, errorThrown) {
                if (onError) {
                    try {
                        onError(url);
                    }
                    catch (err) {
                        logDebug("onError вызвал исключение", err);
                    }
                }
                retries--;
                if (retries <= 0) {
                    let err = new Error(`can't post ${this.url}\nstatus: ${jqXHR.status}\ntextStatus: ${jqXHR.statusText}\nerror: ${errorThrown}`);
                    $deferred.reject(err);
                    return;
                }
                //logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
                let _this = this;
                setTimeout(() => {
                    if (beforePost) {
                        try {
                            beforePost(url);
                        }
                        catch (err) {
                            logDebug("beforePost вызвал исключение", err);
                        }
                    }
                    $.ajax(_this);
                }, timeout);
            }
        });
        return $deferred.promise();
    });
}
// COMMON ----------------------------------------
let $xioDebug = false;
function logDebug(msg, ...args) {
    if (!$xioDebug)
        return;
    console.log(msg, ...args);
}
/**
 * определяет есть ли на странице несколько страниц которые нужно перелистывать или все влазит на одну
 * если не задать аргумента, будет брать текущую страницу
 * @param $html код страницы которую надо проверить
 */
function hasPages($html) {
    // если не задать данные страницы, то считаем что надо использовать текущую
    if ($html == null)
        $html = $(document);
    // там не только кнопки страниц но еще и текст Страницы в первом li поэтому > 2
    let $pageLinks = $html.find('ul.pager_list li');
    return $pageLinks.length > 2;
}
/**
 * Формирует ссылку на установку новой пагинации. Если страница не имеет пагинатора, вернет null
 * @param $html
 * @param pages число элементов на страницу которое установить
 */
function getRepageUrl($html, pages = 10000) {
    if (!hasPages($html))
        return null;
    // снизу всегда несколько кнопок для числа страниц, НО одна может быть уже нажата мы не знаем какая
    // берем просто любую ненажатую, извлекаем ее текст, на у далее в ссылке всегда
    // есть число такое же как текст в кнопке. Заменяем на свое и все ок.
    let $pager = $html.find('ul.pager_options li').has("a").last();
    let num = $pager.text().trim();
    return $pager.find('a').attr('href').replace(num, pages.toString());
}
// SAVE & LOAD ------------------------------------
/**
 * По заданным параметрам создает уникальный ключик использую уникальный одинаковый по всем скриптам префикс
 * @param realm реалм для которого сейвить. Если кросс реалмово, тогда указать null
 * @param code строка отличающая данные скрипта от данных другого скрипта
 * @param subid если для юнита, то указать. иначе пропустить
 */
function buildStoreKey(realm, code, subid) {
    if (code.length === 0)
        throw new RangeError("Параметр code не может быть равен '' ");
    if (realm != null && realm.length === 0)
        throw new RangeError("Параметр realm не может быть равен '' ");
    if (subid != null && realm == null)
        throw new RangeError("Как бы нет смысла указывать subid и не указывать realm");
    let res = "^*"; // уникальная ботва которую добавляем ко всем своим данным
    if (realm != null)
        res += "_" + realm;
    if (subid != null)
        res += "_" + subid;
    res += "_" + code;
    return res;
}
/**
 * Возвращает все ключи ЮНИТОВ для заданного реалма и КОДА.
 * @param realm
 * @param storeKey код ключа sh, udd, vh итд
 */
function getStoredUnitsKeys(realm, storeKey) {
    let res = [];
    for (let key in localStorage) {
        // если в ключе нет числа, не брать его
        let m = extractIntPositive(key);
        if (m == null)
            continue;
        // если ключик не совпадает со старым ключем для посетителей
        let subid = m[0];
        if (key !== buildStoreKey(realm, storeKey, subid))
            continue;
        res.push(key);
    }
    return res;
}
/**
 * Возвращает все ключи ЮНИТОВ для заданного реалма и КОДА. А так же subid юнита отдельно
 * @param realm
 * @param storeKey код ключа sh, udd, vh итд
 */
function getStoredUnitsKeysA(realm, storeKey) {
    let res = [];
    for (let key in localStorage) {
        // если в ключе нет числа, не брать его
        let m = extractIntPositive(key);
        if (m == null)
            continue;
        // если ключик не совпадает со старым ключем для посетителей
        let subid = m[0];
        if (key !== buildStoreKey(realm, storeKey, subid))
            continue;
        res.push([key, subid]);
    }
    return res;
}
/**
 * Выводит текстовое поле, куда выводит все ключи с содержимым в формате ключ=значение|ключи=значение...
 * @param test функция возвращающая ИСТИНУ если данный ключик надо экспортить, иначе ЛОЖЬ
 * @param $place элемент страницы в который будет добавлено текстовое поле для вывода
 */
function Export($place, test) {
    if ($place.length <= 0)
        return false;
    if ($place.find("#txtExport").length > 0) {
        $place.find("#txtExport").remove();
        return false;
    }
    let $txt = $('<textarea id="txtExport" style="display:block;width: 800px; height: 200px"></textarea>');
    let string = "";
    for (let key in localStorage) {
        if (!test(key))
            continue;
        if (string.length > 0)
            string += "|";
        string += `${key}=${localStorage[key]}`;
    }
    $txt.text(string);
    $place.append($txt);
    return true;
}
function ExportA($place, keys, converter, delim = "\n") {
    if ($place.length <= 0)
        return false;
    if ($place.find("#txtExport").length > 0) {
        $place.find("#txtExport").remove();
        return false;
    }
    let $txt = $('<textarea id="txtExport" style="display:block;width: 800px; height: 200px"></textarea>');
    let exportStr = "";
    for (let key of keys) {
        if (exportStr.length > 0)
            exportStr += delim;
        let item = converter == null ? localStorage[key] : converter(localStorage[key]);
        exportStr += `${key}=${item}`;
    }
    $txt.text(exportStr);
    $place.append($txt);
    return true;
}
/**
 * Импортирует в кэш данные введенные к текстовое окно. Формат данных такой же как в экспорте
 * Ключ=Значение|Ключ=Значение итд.
 * Если что то не заладится, будет выпадать с ошибкой. Существующие ключи перезаписывает, с уведомление в консоли
 * @param $place элемент страницы в который будет добавлено текстовое поле для ввода
 */
function Import($place) {
    if ($place.length <= 0)
        return false;
    if ($place.find("#txtImport").length > 0) {
        $place.find("#txtImport").remove();
        $place.find("#saveImport").remove();
        return false;
    }
    let $txt = $('<textarea id="txtImport" style="display:block;width: 800px; height: 200px"></textarea>');
    let $saveBtn = $(`<input id="saveImport" type=button disabled="true" value="Save!">`);
    $txt.on("input propertychange", (event) => $saveBtn.prop("disabled", false));
    $saveBtn.on("click", (event) => {
        let items = $txt.val().split("|"); // элементы вида Ключ=значение
        logDebug(`загружено ${items.length} элементов`);
        try {
            items.forEach((val, i, arr) => {
                let item = val.trim();
                if (item.length <= 0)
                    throw new Error(`получили пустую строку для элемента ${i}, невозможно импортировать.`);
                let kvp = item.split("="); // пара ключ значение
                if (kvp.length !== 2)
                    throw new Error("Должен быть только ключ и значение а по факту не так. " + item);
                let storeKey = kvp[0].trim();
                let storeVal = kvp[1].trim();
                if (storeKey.length <= 0 || storeVal.length <= 0)
                    throw new Error("Длина ключа или данных равна 0 " + item);
                if (localStorage[storeKey] != null)
                    logDebug(`Ключ ${storeKey} существует. Перезаписываем.`);
                localStorage[storeKey] = storeVal;
            });
            alert("импорт завершен");
        }
        catch (err) {
            let msg = err.message;
            alert(msg);
        }
    });
    $place.append($txt).append($saveBtn);
    return true;
}
function ImportA($place, converter, delim = "\n") {
    if ($place.length <= 0)
        return false;
    if ($place.find("#txtImport").length > 0) {
        $place.find("#txtImport").remove();
        $place.find("#saveImport").remove();
        return false;
    }
    let $txt = $('<textarea id="txtImport" style="display:block;width: 800px; height: 200px"></textarea>');
    let $saveBtn = $(`<input id="saveImport" type=button disabled="true" value="Save!">`);
    $txt.on("input propertychange", (event) => $saveBtn.prop("disabled", false));
    $saveBtn.on("click", (event) => {
        let items = $txt.val().split(delim); // элементы вида Ключ=значение
        logDebug(`загружено ${items.length} элементов`);
        try {
            items.forEach((val, i, arr) => {
                let item = val.trim();
                if (item.length <= 0)
                    throw new Error(`получили пустую строку для элемента ${i}, невозможно импортировать.`);
                let kvp = item.split("="); // пара ключ значение
                if (kvp.length !== 2)
                    throw new Error("Должен быть только ключ и значение а по факту не так. " + item);
                let storeKey = kvp[0].trim();
                let storeVal = kvp[1].trim();
                if (storeKey.length <= 0 || storeVal.length <= 0)
                    throw new Error("Длина ключа или данных равна 0 " + item);
                if (localStorage[storeKey] != null)
                    logDebug(`Ключ ${storeKey} существует. Перезаписываем.`);
                localStorage[storeKey] = converter == null ? storeVal : converter(storeVal);
            });
            alert("импорт завершен");
        }
        catch (err) {
            let msg = err.message;
            alert(msg);
        }
    });
    $place.append($txt).append($saveBtn);
    return true;
}
//
// Сюда все функции которые парсят данные со страниц
//
/**
 * По пути картинки выявляется ТМ товар или нет. Обычно в ТМ у нас есть /brand/ кусок
 * @param product
 */
function isTM(product) {
    if (product.img.length <= 0)
        throw new Error(`Нельзя определить брандовость продукта ${product.id} => ${product.name}`);
    return product.img.indexOf("/brand/") >= 0;
}
/**
 * Возвращает ТОЛЬКО текст элемента БЕЗ его наследников
 * @param el
 */
function getInnerText(el) {
    return $(el).clone().children().remove().end().text();
}
/**
 * Из набора HTML элементов представляющих собой tr парсит subid. Ряды должны быть стандартного формата.
 */
function parseSubid($rows) {
    if ($rows == null)
        throw new ArgumentNullError("trList");
    let f = (i, e) => numberfyOrError($(e).text());
    return $rows.find("td.unit_id").map(f).get();
}
/**
 * Берет локальное хранилище и тащит оттуда все записи по юнитам. возвращает subid
 */
function parseAllSavedSubid(realm) {
    if (!realm || realm.length === 0)
        throw new ArgumentNullError("realm");
    let subids = [];
    let rx = new RegExp("x" + realm + "\\d+");
    for (let key in localStorage) {
        if (!rx.test(key))
            continue;
        let m = key.match(/\d+/);
        if (m != null)
            subids.push(numberfy(m[0]));
    }
    return subids;
}
/**
 * Парсинг главной страницы с юнитами.
 * @param html
* @param url
 */
function parseUnitList(html, url) {
    let $html = $(html);
    try {
        let $table = $html.find("table.unit-list-2014");
        let res = {};
        let $rows = closestByTagName($table.find("td.unit_id"), "tr");
        if ($rows.length === 0)
            throw new Error("Не нашел ни одного юнита, что не может быть");
        $rows.each((i, el) => {
            let $r = $(el);
            let subid = numberfyOrError($r.find("td.unit_id").text());
            let typestr = $r.find("td.info").attr("class").split("-")[1];
            if (typestr == null)
                throw new Error("class attribute doesn't contains type part.");
            // такой изврат с приведением из за компилера. надо чтобы работало
            let type = UnitTypes[typestr] ? UnitTypes[typestr] : UnitTypes.unknown;
            if (type == UnitTypes.unknown)
                throw new Error("Не описан тип юнита " + typestr);
            let name = oneOrError($r, "td.info a").text().trim();
            if (name.length <= 0)
                throw new Error(`имя юнита ${subid} не спарсилось.`);
            let size = oneOrError($r, "td.size").find("div.graybox").length; // >= 0
            let city = oneOrError($r, "td.geo").text().trim();
            res[subid] = {
                subid: subid,
                type: type,
                name: name,
                size: size,
                city: city
            };
        });
        return res;
    }
    catch (err) {
        console.log(url);
        throw err;
    }
}
/**
 * Парсит "/main/unit/view/ + subid + /sale" урлы
 * Склады, это их тема
 * @param html
 * @param url
 */
function parseSale(html, url) {
    let $html = $(html);
    try {
        let $rows = $html.find("table.grid").find("tr.even, tr.odd");
        // помним что на складах есть позиции без товаров и они как бы не видны по дефолту в продаже, но там цена 0 и есть политика сбыта.
        let _form = $html.find("[name=storageForm]");
        // может быть -1 если вдруг ничего не выбрано в селекте, что маовероятно
        let _policy = $rows.find("select:nth-child(3)").map((i, e) => $(e).find("[selected]").index()).get();
        let _price = $rows.find("input.money:nth-child(1)").map((i, e) => numberfy($(e).val())).get();
        let _incineratorMaxPrice = $html.find('span[style="COLOR: green;"]').map((i, e) => numberfy($(e).text())).get();
        let stockIndex = $html.find("table.grid").find("th:contains('На складе')").index();
        let $stockTd = $rows.children(`td:nth-child(${stockIndex + 1})`);
        let _stockamount = $stockTd.find("tr:nth-child(1)").find("td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        let _stockqual = $stockTd.find("tr:nth-child(2)").find("td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        let _stockprime = $stockTd.find("tr:nth-child(3)").find("td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        // относится к производству. для складов тупо редиректим на ячейку со складом. Будет одно и то же для склада и для выхода.
        let outIndex = $html.find("table.grid").find("th:contains('Выпуск')").index();
        let $outTd = outIndex >= 0 ? $rows.children(`td:nth-child(${outIndex + 1})`) : $stockTd;
        let _outamount = $outTd.find("tr:nth-child(1)").find("td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        let _outqual = $outTd.find("tr:nth-child(2)").find("td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        let _outprime = $outTd.find("tr:nth-child(3)").find("td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        // название продукта Спортивное питание, Маточное молочко и так далее
        let _product = $rows.find("a:not([onclick])").map((i, e) => {
            let t = $(e).text();
            if (t.trim() === "")
                throw new Error("product name is empty");
            return t;
        }).get();
        // номер продукта
        let _productId = $rows.find("a:not([onclick])").map((i, e) => {
            let m = $(e).attr("href").match(/\d+/);
            if (m == null)
                throw new Error("product id not found.");
            return numberfyOrError(m[0]);
        }).get();
        // "Аттика, Македония, Эпир и Фессалия"
        let _region = $html.find(".officePlace a:eq(-2)").text();
        if (_region.trim() === "")
            throw new Error("region not found");
        // если покупцов много то появляется доп ссылка на страницу с контрактами. эта херь и говорит есть она или нет
        let _contractpage = !!$html.find(".tabsub").length;
        // TODO: сделать чтобы контракты были вида [товар, [линк на юнит, цена контракта]]. Тогда тупо словарь удобный для работы а не текущая хуйня
        // данное поле существует только если НЕТ ссылки на контракты то есть в простом случае и здесь может быть такой хуйня
        // ["Молоко", "$1.41", "$1.41", "$1.41", "Мясо", "$5.62"]
        // идет категория, потом цены покупателей, потом снова категория и цены. И как бы здесь нет порядка
        // Если покупателей нет, гарантируется пустой массив!
        let _contractprice = ($html.find("script:contains(mm_Msg)").text().match(/(\$(\d|\.| )+)|(\[\'name\'\]		= \"[a-zA-Zа-яА-ЯёЁ ]+\")/g) || []).map((e) => {
            return e[0] === "[" ? e.slice(13, -1) : numberfy(e);
        });
        return {
            form: _form,
            policy: _policy,
            price: _price,
            incineratorMaxPrice: _incineratorMaxPrice,
            outamount: _outamount,
            outqual: _outqual,
            outprime: _outprime,
            stockamount: _stockamount,
            stockqual: _stockqual,
            stockprime: _stockprime,
            product: _product,
            productId: _productId,
            region: _region,
            contractpage: _contractpage,
            contractprice: _contractprice
        };
    }
    catch (err) {
        throw new ParseError("sale", url, err);
    }
}
function _parseSaleNew(html, url) {
    let $html = $(html);
    // парсинг ячейки продукта на складе или на производстве
    // продукт идентифицируется уникально через картинку и имя. Урл на картинку нам пойдет
    // так же есть у продуктов уникальный id, но не всегда его можно выдрать
    let parseProduct = ($td) => {
        let img = $td.find("img").eq(0).attr("src");
        let $a = $td.find("a");
        // название продукта Спортивное питание, Маточное молочко и так далее
        let name = $a.text().trim();
        if (name.length === 0)
            throw new Error("Имя продукта пустое.");
        // номер продукта
        let m = $a.attr("href").match(/\d+/);
        if (m == null)
            throw new Error("id продукта не найден");
        let id = numberfyOrError(m[0], 0); // должно быть больше 0 полюбому
        return { name: name, img: img, id: id };
    };
    // парсинг ячеек на складе и выпуск 
    // если нет товара то прочерки стоят.вывалит - 1 для таких ячеек
    let parseStock = ($td) => {
        return {
            quantity: numberfy($td.find("tr").eq(0).find("td").eq(1).text()),
            quality: numberfy($td.find("tr").eq(1).find("td").eq(1).text()),
            price: numberfy($td.find("tr").eq(2).find("td").eq(1).text()),
            brand: -1
        };
    };
    // ищет имена в хедерах чтобы получить индексы колонок
    let parseHeaders = ($ths) => {
        // индексы колонок с данными
        let prodIndex = $ths.filter(":contains('Продукт')").index();
        let stockIndex = $ths.filter(":contains('На складе')").index();
        // для склада нет выпуска и ячейки может не быть. Просто дублируем складскую ячейку
        let outIndex = $ths.filter(":contains('Выпуск')").index();
        if (outIndex < 0)
            outIndex = stockIndex;
        let policyIndex = $ths.filter(":contains('Политика сбыта')").index();
        let priceIndex = $ths.filter(":contains('Цена')").index();
        let orderedIndex = $ths.filter(":contains('Объем заказов')").index();
        let freeIndex = $ths.filter(":contains('Свободно')").index();
        let obj = {
            prod: prodIndex,
            stock: stockIndex,
            out: outIndex,
            policy: policyIndex,
            price: priceIndex,
            ordered: orderedIndex,
            free: freeIndex
        };
        return obj;
    };
    let parseContractRow = ($row) => {
        // тип покупца вытащим из картинки. для завода workshop
        let items = $row.find("img[src*=unit_types]").attr("src").split("/");
        let unitType = items[items.length - 1].split(".")[0];
        let companyName = $row.find("b").text();
        let $a = $row.find("a").eq(1);
        let unitId = matchedOrError($a.attr("href"), new RegExp(/\d+/));
        let $td = $a.closest("td");
        let purshased = numberfyOrError($td.next("td").text(), -1);
        let ordered = numberfyOrError($td.next("td").next("td").text(), -1);
        let price = numberfyOrError($td.next("td").next("td").next("td").text(), -1);
        return {
            CompanyName: companyName,
            UnitType: unitType,
            UnitId: unitId,
            Ordered: ordered,
            Purchased: purshased,
            Price: price
        };
    };
    try {
        let $storageTable = $("table.grid");
        // помним что на складах есть позиции без товаров и они как бы не видны по дефолту в продаже, но там цена 0 и есть политика сбыта.
        let _storageForm = $html.find("[name=storageForm]");
        let _incineratorMaxPrice = $html.find('span[style="COLOR: green;"]').map((i, e) => numberfy($(e).text())).get();
        // "Аттика, Македония, Эпир и Фессалия"
        let _region = $html.find(".officePlace a:eq(-2)").text().trim();
        if (_region === "")
            throw new Error("region not found");
        // если покупцов много то появляется доп ссылка на страницу с контрактами. эта херь и говорит есть она или нет
        let _contractpage = !!$html.find(".tabsub").length;
        // берем все стркои включая те где нет сбыта и они пусты. Может быть глюки если заказы есть товара нет. Хз в общем.
        // список ВСЕХ продуктов на складе юнита. Даже тех которых нет в наличии, что актуально для складов
        let products = {};
        let $rows = $storageTable.find("select[name*='storageData']").closest("tr");
        let th = parseHeaders($storageTable.find("th"));
        for (let i = 0; i < $rows.length; i++) {
            let $r = $rows.eq(i);
            let product = parseProduct($r.children("td").eq(th.prod));
            // для складов и производства разный набор ячеек и лучше привязаться к именам чем индексам
            let stock = parseStock($r.children("td").eq(th.stock));
            let out = parseStock($r.children("td").eq(th.out));
            let freeQuantity = numberfyOrError($r.children("td").eq(th.free).text(), -1);
            let orderedQuantity = numberfyOrError($r.children("td").eq(th.ordered).text(), -1);
            // может быть -1 если вдруг ничего не выбрано в селекте, что маовероятно
            let policy = $r.find("select:nth-child(3)").prop("selectedIndex");
            let price = numberfyOrError($r.find("input.money:nth-child(1)").eq(0).val(), -1);
            if (products[product.img] != null)
                throw new Error("Что то пошло не так. Два раза один товар");
            products[product.img] = {
                product: product,
                stock: stock,
                out: out,
                freeQuantity: freeQuantity,
                orderedQuantity: orderedQuantity,
                salePolicy: policy,
                salePrice: price
            };
        }
        // Парсим контракты склада
        let contracts = {};
        if (_contractpage) {
        }
        else {
            let $consumerForm = $html.find("[name=consumerListForm]");
            let $consumerTable = $consumerForm.find("table.salelist");
            // находим строки с заголовками товара. Далее между ними находятся покупатели. Собираем их
            let $prodImgs = $consumerTable.find("img").filter("[src*='products']");
            let $productRows = $prodImgs.closest("tr"); // ряды содержащие категории то есть имя товара
            // покупцы в рядах с id
            let $contractRows = $consumerTable.find("tr[id]");
            if ($contractRows.length < $prodImgs.length)
                throw new Error("Что то пошло не так. Число контрактов МЕНЬШЕ числа категорий");
            let prodInd = -1;
            let lastInd = -1;
            let key = "";
            for (let i = 0; i < $contractRows.length; i++) {
                let $r = $contractRows.eq(i);
                // если разница в индексах больше 1 значит была вставка ряда с именем товара и мы уже другой товар смотрим
                if ($r.index() > lastInd + 1) {
                    prodInd++;
                    key = $prodImgs.eq(prodInd).attr("src");
                    contracts[key] = [];
                }
                contracts[key].push(parseContractRow($r));
                lastInd = $r.index();
            }
        }
        return {
            region: _region,
            incineratorMaxPrice: _incineratorMaxPrice,
            form: _storageForm,
            contractpage: _contractpage,
            products: products,
            contracts: contracts
        };
    }
    catch (err) {
        //throw new ParseError("sale", url, err);
        throw err;
    }
}
var SalePolicies;
(function (SalePolicies) {
    SalePolicies[SalePolicies["nosale"] = 0] = "nosale";
    SalePolicies[SalePolicies["any"] = 1] = "any";
    SalePolicies[SalePolicies["some"] = 2] = "some";
    SalePolicies[SalePolicies["company"] = 3] = "company";
    SalePolicies[SalePolicies["corporation"] = 4] = "corporation";
})(SalePolicies || (SalePolicies = {}));
/**
 * форма, товары
 * @param html
 * @param url
 */
function parseSaleNew(html, url) {
    let $html = $(html);
    try {
        let $tbl = oneOrError($html, "table.grid");
        let $form = $html.find("form[name=storageForm]");
        let $rows = closestByTagName($tbl.find("select[name*='storageData']"), "tr");
        let dict = {};
        $rows.each((i, el) => {
            let $r = $(el);
            let $tds = $r.children("td");
            // товар
            let prod = parseProduct($tds.eq(2));
            let $price = oneOrError($tds.eq(6), "input.money");
            let $policy = oneOrError($tds.eq(7), "select:eq(0)");
            dict[prod.img] = {
                product: prod,
                stock: parseStock($tds.eq(3)),
                outOrdered: numberfyOrError($tds.eq(4).text(), -1),
                price: numberfyOrError($price.val(), -1),
                salePolicy: $policy.prop("selectedIndex"),
                priceName: $price.attr("name"),
                policyName: $policy.attr("name"),
            };
        });
        return [$form, dict];
    }
    catch (err) {
        //throw new ParseError("sale", url, err);
        throw err;
    }
    function parseProduct($td) {
        // товар
        let $img = oneOrError($td, "img");
        let img = $img.attr("src");
        let name = $img.attr("alt");
        let $a = oneOrError($td, "a");
        let n = extractIntPositive($a.attr("href"));
        if (n == null || n.length > 1)
            throw new Error("не нашли id товара " + img);
        let id = n[0];
        return { name: name, img: img, id: id };
    }
    // если товара нет, то характеристики товара зануляет
    function parseStock($td) {
        let $rows = $td.find("tr");
        // могут быть прочерки для товаров которых нет вообще
        let available = numberfy(oneOrError($td, "td:contains(Количество)").next("td").text());
        if (available < 0)
            available = 0;
        return {
            available: available,
            product: {
                brand: 0,
                price: available > 0 ? numberfyOrError(oneOrError($td, "td:contains(Себестоимость)").next("td").text()) : 0,
                quality: available > 0 ? numberfyOrError(oneOrError($td, "td:contains(Качество)").next("td").text()) : 0
            }
        };
    }
}
///**
// * Парсит страницы вида "/main/unit/view/ + subid + /sale/product", а так же
// * "/main/unit/view/" + subid + "/sale/product/ + productId"
// * @param html
// * @param url
// */
//function parseSaleContracts(html: any, url: string): ISaleContract {
//    let $html = $(html);
//    // слегка дибильный подход. В объекте мы имеем цены покупцов для одной категории по url, но список категорий 
//    // каждый раз забираем весь.
//    // TODO: перепилить. Сделать контракт как {url:string, ИмяТовара:string, prices: number[]} 
//    // итоговая структура будет выглядеть так 
//    /* $mapped[subid/sale/product] = {
//            categories: string[];  - список урлов категорий
//        }
//        а далее
//        $mapped[subid/sale/product/prodId] = {
//            prodName: string; - строковое имя продукта    
//            buyerPrices: number[]; - массив цен покупцов данного товара
//        }
//        аналогично делать ISale. Вместо хуйни с string|number вставить туда сразу свойство
//        contracts: IDictionary<ISaleContract> содержащее инфу по всем товарам. ключом будет productId или его урл
//    */ 
//    try {
//        // каждая категория представляет товар который продается со склада или производства. По факту берем ссыль через которую
//        // попадаем на список покупателей товара.
//        // если покупцов товара НЕТ, тогда данной категории не будет. То есть не может быть пустая категория
//        let _categorys = $html.find("#productsHereDiv a").map(function (i, e) { return $(e).attr("href"); }).get() as any as string[];
//        // здесь уже есть четкая гарантия что резалт будет вида 
//        // ["Медицинский инструментарий", 534.46, 534.46, 534.46, 534.46]
//        // то есть первым идет название а потом цены покупателей
//        let _contractprices = ($html.find("script:contains(mm_Msg)").text().match(/(\$(\d|\.| )+)|(\[\'name\'\]		= \"[a-zA-Zа-яА-ЯёЁ ]+\")/g) || []).map(function (e) { return e[0] === "[" ? e.slice(13, -1) : numberfy(e) }) as any as string | number[]
//        return { category: _categorys, contractprice: _contractprices };
//    }
//    catch (err) {
//        throw new ParseError("sale contracts", url, err);
//    }
//}
/**
 * Парсинг данных по страницы /main/unit/view/8004742/virtasement
 * @param html
 * @param url
 */
function parseAds(html, url) {
    let $html = $(html);
    try {
        // известность
        let _celebrity = numberfyOrError($html.find(".infoblock tr:eq(0) td:eq(1)").text(), -1);
        // население города
        let _pop = (() => {
            // если регулярка сработала значит точно нашли данные
            let m = execOrError($html.find("script").text(), /params\['population'\] = (\d+);/i);
            return numberfyOrError(m[1], 0);
        })();
        // текущий бюджет, он может быть и 0
        let _budget = numberfyOrError($html.find("input:text:not([readonly])").val(), -1);
        // бюжет на поддержание известности
        // ["не менее ©110.25  в неделю для ТВ-рекламы"] здесь может быть и $110.25
        // данный бюжет тоже может быть 0 если известность 0
        let _requiredBudget = numberfyOrError($html.find(".infoblock tr:eq(1) td:eq(1)").text().split(/[$©]/g)[1], -1);
        //if (_celebrity > 0 && _requiredBudget === 0)  такое может быть при хреновой известности
        //    throw new Error("required budget can't be 0 for celebrity" + _celebrity);
        return {
            celebrity: _celebrity,
            pop: _pop,
            budget: _budget,
            requiredBudget: _requiredBudget
        };
    }
    catch (err) {
        throw new ParseError("ads", url, err);
    }
}
/**
 * Парсим данные  с формы зарплаты /window/unit/employees/engage/" + subid
 * @param html
 * @param url
 */
function parseSalary(html, url) {
    let $html = $(html);
    try {
        let _form = $html.filter("form");
        let _employees = numberfy($html.find("#quantity").val());
        let _maxEmployees = numberfy($html.find("tr.even:contains('Максимальное количество')").find("td.text_to_left").text());
        if (_maxEmployees <= 0)
            throw new RangeError("Макс число рабов не может быть 0.");
        let _salaryNow = numberfy($html.find("#salary").val());
        let _salaryCity = numberfyOrError($html.find("tr:nth-child(3) > td").text().split(/[$©]/g)[1]);
        let _skillNow = numberfy($html.find("#apprisedEmployeeLevel").text());
        let _skillCity = (() => {
            let m = $html.find("div span[id]:eq(1)").text().match(/[0-9]+(\.[0-9]+)?/);
            if (m == null)
                throw new Error("city skill not found.");
            return numberfyOrError(m[0]);
        })();
        let _skillReq = (() => {
            let m = $html.find("div span[id]:eq(1)").text().split(",")[1].match(/(\d|\.)+/);
            if (m == null)
                throw new Error("skill req not found.");
            return numberfy(m[0]);
        })();
        return {
            form: _form,
            employees: _employees,
            maxEmployees: _maxEmployees,
            salaryNow: _salaryNow,
            salaryCity: _salaryCity,
            skillNow: _skillNow,
            skillCity: _skillCity,
            skillReq: _skillReq
        };
    }
    catch (err) {
        throw new ParseError("unit list", url, err);
    }
}
/**
 * /olga/window/unit/employees/education/6566432
 * @param html
 * @param url
 */
function parseEducation(html, url) {
    let $html = $(html);
    try {
        // формы может не быть если обучение уже запущено
        let $form = $html.filter("form"); // через find не находит какого то хера
        if ($form.length <= 0)
            return null;
        let $tbl = oneOrError($html, "table.list");
        let salaryNow = numberfyOrError($tbl.find("td:eq(8)").text());
        let salaryCity = numberfyOrError($tbl.find("td:eq(9)").text().split("$")[1]);
        let weekcost = numberfyOrError($tbl.find("#educationCost").text());
        let employees = numberfyOrError($tbl.find("#unitEmployeesData_employees").val(), -1);
        let emplMax = numberfyOrError($tbl.find("td:eq(2)").text().split(":")[1]);
        let skillNow = numberfyOrError($tbl.find("span:eq(0)").text());
        let skillCity = numberfyOrError($tbl.find("span:eq(1)").text());
        let skillRequired = numberfyOrError($tbl.find("span:eq(2)").text(), -1); // может быть и 0
        return [weekcost, {
                form: $form,
                employees: employees,
                maxEmployees: emplMax,
                salaryCity: salaryCity,
                salaryNow: salaryNow,
                skillCity: skillCity,
                skillReq: skillRequired,
                skillNow: skillNow
            }];
    }
    catch (err) {
        throw err;
    }
}
/**
 * /main/user/privat/persondata/knowledge
 * @param html
 * @param url
 */
function parseManager(html, url) {
    let $html = $(html);
    try {
        // бонусной херни не всегда может быть поэтому надо заполнять руками
        let stats = (() => {
            let jq = $html.find("tr.qual_item").find("span.mainValue");
            if (jq.length === 0)
                throw new Error("top stats not found");
            // не может быть 0
            let main = jq.map((i, e) => numberfyOrError($(e).text())).get();
            // может быть 0. иногда бонусного спана совсем нет
            let bonus = jq.map((i, e) => {
                let bonusSpan = $(e).next("span.bonusValue");
                if (bonusSpan.length === 0)
                    return 0;
                let n = numberfy(bonusSpan.text());
                return n < 0 ? 0 : n;
            }).get();
            return [main, bonus];
        })();
        let _base = stats[0];
        let _bonus = stats[1];
        let _pic = $html.find(".qual_item img").map((i, e) => $(e).attr("src")).get();
        if (_base.length !== _bonus.length || _base.length !== _pic.length)
            throw new Error("что то пошло не так. массивы разной длины");
        return {
            base: _base,
            bonus: _bonus,
            pic: _pic
        };
    }
    catch (err) {
        throw err;
    }
}
/**
 * /main/unit/view/ + subid
 * @param html
 * @param url
 */
function parseUnitMain(html, url) {
    let $html = $(html);
    try {
        let newInterf = $html.find(".unit_box").length > 0;
        if (newInterf) {
            let _employees = numberfy($html.find(".unit_box:has(.fa-users) tr:eq(0) td:eq(1)").text());
            let _salaryNow = numberfy($html.find(".unit_box:has(.fa-users) tr:eq(2) td:eq(1)").text());
            let _salaryCity = numberfy($html.find(".unit_box:has(.fa-users) tr:eq(3) td:eq(1)").text());
            let _skillNow = numberfy($html.find(".unit_box:has(.fa-users) tr:eq(4) td:eq(1)").text());
            let _skillReq = numberfy($html.find(".unit_box:has(.fa-users) tr:eq(5) td:eq(1)").text());
            // TODO: в новом интерфейсе не все гладко. проверить как оборудование ищет
            let _equipNum = numberfy($html.find(".unit_box:has(.fa-cogs) tr:eq(0) td:eq(1)").text());
            let _equipMax = numberfy($html.find(".unit_box:has(.fa-cogs) tr:eq(1) td:eq(1)").text());
            let _equipQual = numberfy($html.find(".unit_box:has(.fa-cogs) tr:eq(2) td:eq(1)").text());
            let _equipReq = numberfy($html.find(".unit_box:has(.fa-cogs) tr:eq(3) td:eq(1)").text());
            let _equipWearBlack = numberfy($html.find(".unit_box:has(.fa-cogs) tr:eq(4) td:eq(1)").text().split("(")[1]);
            let _equipWearRed = $html.find(".unit_box:has(.fa-cogs) tr:eq(4) td:eq(1) span").length === 1;
            let _managerPic = $html.find(".unit_box:has(.fa-user) ul img").attr("src");
            let _qual = numberfy($html.find(".unit_box:has(.fa-user) tr:eq(1) td:eq(1)").text());
            let _techLevel = numberfy($html.find(".unit_box:has(.fa-industry) tr:eq(3) td:eq(1)").text());
            // общее число подчиненных по профилю
            let _totalEmployees = numberfy($html.find(".unit_box:has(.fa-user) tr:eq(2) td:eq(1)").text());
            let _img = $html.find("#unitImage img").attr("src").split("/")[4].split("_")[0];
            let _size = numberfy($html.find("#unitImage img").attr("src").split("_")[1]);
            let _hasBooster = !$html.find("[src='/img/artefact/icons/color/production.gif']").length;
            let _hasAgitation = !$html.find("[src='/img/artefact/icons/color/politics.gif']").length;
            let _onHoliday = !!$html.find("[href$=unset]").length;
            let _isStore = !!$html.find("[href$=trading_hall]").length;
            let _departments = numberfy($html.find("tr:contains('Количество отделов') td:eq(1)").text());
            let _visitors = numberfy($html.find("tr:contains('Количество посетителей') td:eq(1)").text());
            return {
                type: UnitTypes.unknown,
                employees: _employees,
                totalEmployees: _totalEmployees,
                employeesReq: -1,
                salaryNow: _salaryNow,
                salaryCity: _salaryCity,
                skillNow: _skillNow,
                skillCity: -1,
                skillReq: _skillReq,
                equipNum: _equipNum,
                equipMax: _equipMax,
                equipQual: _equipQual,
                equipReq: _equipReq,
                equipBroken: -1,
                equipWearBlack: _equipWearBlack,
                equipWearRed: _equipWearRed,
                managerPic: _managerPic,
                qual: _qual,
                techLevel: _techLevel,
                img: _img,
                size: _size,
                hasBooster: _hasBooster,
                hasAgitation: _hasAgitation,
                onHoliday: _onHoliday,
                isStore: _isStore,
                departments: _departments,
                visitors: _visitors,
                service: ServiceLevels.none
            };
        }
        else {
            let rxFloat = new RegExp(/\d+\.\d+/g);
            let rxInt = new RegExp(/\d+/g);
            let $block = $html.find("table.infoblock");
            // Количество рабочих. может быть 0 для складов.
            let empl = (() => {
                // Возможные варианты для рабочих будут
                // 10(требуется ~ 1)
                // 10(максимум:1)
                // 10 ед. (максимум:1) это уже не включать
                // 1 000 (максимум:10 000) пробелы в числах!!
                let types = ["сотрудников", "работников", "учёных", "рабочих"];
                let res = [-1, -1];
                //let emplRx = new RegExp(/\d+\s*\(.+\d+.*\)/g);
                //let td = jq.next("td").filter((i, el) => emplRx.test($(el).text()));
                let jq = $block.find('td.title:contains("Количество")').filter((i, el) => {
                    return types.some((t, i, arr) => $(el).text().indexOf(t) >= 0);
                });
                if (jq.length !== 1)
                    return res;
                // например в лаборатории будет находить вместо требований, так как их нет, макс число рабов в здании
                let m = jq.next("td").text().replace(/\s*/g, "").match(rxInt);
                if (!m || m.length !== 2)
                    return res;
                return [parseFloat(m[0]), parseFloat(m[1])];
            })();
            let _employees = empl[0];
            let _employeesReq = empl[1];
            // общее число подчиненных по профилю
            let _totalEmployees = numberfy($block.find('td:contains("Суммарное количество подчинённых")').next("td").text());
            let salary = (() => {
                //let rx = new RegExp(/\d+\.\d+.+в неделю\s*\(в среднем по городу.+?\d+\.\d+\)/ig);
                let jq = $block.find('td.title:contains("Зарплата")').next("td");
                if (jq.length !== 1)
                    return ["-1", "-1"];
                let m = jq.text().replace(/\s*/g, "").match(rxFloat);
                if (!m || m.length !== 2)
                    return ["-1", "-1"];
                return m;
            })();
            let _salaryNow = numberfy(salary[0]);
            let _salaryCity = numberfy(salary[1]);
            let skill = (() => {
                let jq = $block.find('td.title:contains("Уровень квалификации")').next("td");
                if (jq.length !== 1)
                    return ["-1", "-1", "-1"];
                // возможные варианты результата
                // 10.63 (в среднем по городу 9.39, требуется по технологии 6.74)
                // 9.30(в среднем по городу 16.62 )
                let m = jq.text().match(rxFloat);
                if (!m || m.length < 2)
                    return ["-1", "-1", "-1"];
                return [m[0], m[1], m[2] || "-1"];
            })();
            let _skillNow = numberfy(skill[0]);
            let _skillCity = numberfy(skill[1]);
            let _skillReq = numberfy(skill[2]); // для лаб требования может и не быть
            let equip = (() => {
                let res = [-1, -1, -1, -1, -1, -1, -1];
                // число оборудования тупо не ищем. гемор  не надо
                // качество оборудования и треб по технологии
                let jq = $block.find('td.title:contains("Качество")').next("td");
                if (jq.length === 1) {
                    // 8.40 (требуется по технологии 1.00)
                    // или просто 8.40 если нет требований
                    let m = jq.text().match(rxFloat);
                    if (m && m.length > 0) {
                        res[2] = parseFloat(m[0]) || -1;
                        res[3] = parseFloat(m[1]) || -1;
                    }
                }
                // красный и черный и % износа
                // 1.28 % (25+1 ед.)
                // 0.00 % (0 ед.)
                let types = ["Износ", "Здоровье"];
                jq = $block.find("td.title").filter((i, el) => {
                    return types.some((t, i, arr) => $(el).text().indexOf(t) >= 0);
                });
                if (jq.length === 1) {
                    let rx = new RegExp(/(\d+\.\d+)\s*%\s*\((\d+)(?:\+(\d+))*.*\)/ig);
                    let m = rx.exec(jq.next("td").text());
                    if (m) {
                        // первым идет сама исходная строка
                        res[4] = parseFloat(m[1]); // 0  или float.
                        res[5] = parseInt(m[2]); // 0 или целое
                        res[6] = parseInt(m[3]) || -1; // красного может не быть будет undefined
                    }
                }
                return res;
            })();
            let _equipNum = equip[0];
            let _equipMax = equip[1];
            let _equipQual = equip[2];
            let _equipReq = equip[3];
            // % износа или здоровье животных для ферм.
            let _equipBroken = equip[4];
            // кол-во черного оборудования
            let _equipWearBlack = equip[5];
            // есть ли красное оборудование или нет
            let _equipWearRed = equip[6] > 0;
            let _managerPic = "";
            let _qual = (() => {
                let jq = $block.find("td.title:contains('Квалификация игрока')").next("td");
                if (jq.length !== 1)
                    return -1;
                return numberfy(jq.text());
            })();
            let _techLevel = (() => {
                let jq = $block.find("td.title:contains('Уровень технологии')").next("td");
                if (jq.length !== 1)
                    return -1;
                return numberfy(jq.text());
            })();
            // обработка картинки
            let [_img, _size] = (() => {
                let imgsrc = oneOrError($html, "#unitImage img").attr("src");
                let imgfile = imgsrc.split("/").pop();
                if (imgfile == null)
                    throw new Error(`какая то ошибка в обработке картинки ${imgsrc} юнита`);
                // в методе странно но номера символов походу не с 0 идут а с 1
                let imgname = imgfile.split(".")[0]; // без расширения уже
                let img = imgname.substring(0, imgname.length - 1 - 1);
                let size = numberfyOrError(imgname.substring(imgname.length - 1, imgname.length));
                return [img, size];
            })();
            // такой изврат с приведением из за компилера. надо чтобы работало
            let _type = UnitTypes[_img] ? UnitTypes[_img] : UnitTypes.unknown;
            if (_type == UnitTypes.unknown)
                throw new Error("Не описан тип юнита " + _img);
            //  есть ли возможность вкорячить бустер производства типо солнечных панелей или нет. если не занято то втыкает
            let _hasBooster = !$html.find("[src='/img/artefact/icons/color/production.gif']").length;
            // хз что это вообще
            let _hasAgitation = !$html.find("[src='/img/artefact/icons/color/politics.gif']").length;
            let _onHoliday = !!$html.find("[href$=unset]").length;
            let _isStore = !!$html.find("[href$=trading_hall]").length;
            let _departments = numberfy($html.find('tr:contains("Количество отделов") td:eq(1)').text()) || -1;
            let $r = $html.find("tr:contains('Количество посетителей')");
            let _visitors = numberfy($r.find("td:eq(1)").text()) || -1;
            $r = $r.next("tr");
            let _service = ServiceLevels.none;
            {
                let txt = "";
                // для магазинов уровень в спец хинте лежит, для заправок/сервисов просто ячейка
                // но хинта может и не быть вовсе если маг в отпуске или товар нет
                if (_type === UnitTypes.shop)
                    txt = $r.find("div.productivity_hint div.title").text().trim();
                else
                    // last надо потому что может быть вложенная ячейка и нужно взять самую вложенную
                    txt = $html.find("td:contains(Уровень сервиса)").last().next("td").text().trim();
                if (txt.length > 1)
                    switch (txt.toLowerCase()) {
                        case "элитный":
                            _service = ServiceLevels.elite;
                            break;
                        case "очень высокий":
                            _service = ServiceLevels.higher;
                            break;
                        case "высокий":
                            _service = ServiceLevels.high;
                            break;
                        case "нормальный":
                            _service = ServiceLevels.normal;
                            break;
                        case "низкий":
                            _service = ServiceLevels.low;
                            break;
                        case "очень низкий":
                            _service = ServiceLevels.lower;
                            break;
                        case "не известен":
                            _service = ServiceLevels.none;
                            break;
                        default:
                            throw new Error("Не смог идентифицировать указанный уровень сервиса " + txt);
                    }
            }
            return {
                type: _type,
                employees: _employees,
                totalEmployees: _totalEmployees,
                employeesReq: _employeesReq,
                salaryNow: _salaryNow,
                salaryCity: _salaryCity,
                skillNow: _skillNow,
                skillCity: _skillCity,
                skillReq: _skillReq,
                equipNum: _equipNum,
                equipMax: _equipMax,
                equipQual: _equipQual,
                equipReq: _equipReq,
                equipBroken: _equipBroken,
                equipWearBlack: _equipWearBlack,
                equipWearRed: _equipWearRed,
                managerPic: _managerPic,
                qual: _qual,
                techLevel: _techLevel,
                img: _img,
                size: _size,
                hasBooster: _hasBooster,
                hasAgitation: _hasAgitation,
                onHoliday: _onHoliday,
                isStore: _isStore,
                departments: _departments,
                visitors: _visitors,
                service: _service
            };
        }
    }
    catch (err) {
        throw err; // new ParseError("unit main page", url, err);
    }
}
function parseUnitMainNew(html, url) {
    let $html = $(html);
    try {
        if ($html.find(".unit_box").length > 0)
            throw new Error("Не работаю на новом интерфейсе");
        let mainBase = base();
        switch (mainBase.type) {
            case UnitTypes.warehouse:
                return $.extend({}, mainBase, ware(mainBase.size));
            case UnitTypes.shop:
                return $.extend({}, mainBase, shop());
            case UnitTypes.fuel:
                return $.extend({}, mainBase, fuel());
            default:
                return mainBase;
        }
    }
    catch (err) {
        throw err; // new ParseError("unit main page", url, err);
    }
    // юнит, img, эффективность
    function base() {
        // subid 
        let $a = oneOrError($html, "a[data-name='itour-tab-unit-view']");
        let n = extractIntPositive($a.attr("href"));
        if (n == null)
            throw new Error(`на нашел subid юнита`);
        let subid = n[0];
        // city
        // "    Расположение: Великие Луки ("
        let lines = getOnlyText(oneOrError($html, "div.officePlace"));
        let arr = execOrError(lines[1].trim(), /^расположение:(.*)\(/i);
        //let city = lines[1].split(":")[1].split("(")[0].trim();
        let city = arr[1].trim();
        if (city == null || city.length < 1)
            throw new Error(`не найден город юнита ${city}`);
        // name
        let name = oneOrError($html, "#headerInfo h1").text().trim();
        // обработка картинки
        let imgsrc = oneOrError($html, "#unitImage img").attr("src");
        let imgfile = imgsrc.split("/").pop();
        if (imgfile == null)
            throw new Error(`какая то ошибка в обработке картинки ${imgsrc} юнита`);
        // в методе странно но номера символов походу не с 0 идут а с 1
        let imgname = imgfile.split(".")[0]; // без расширения уже
        let img = imgname.substring(0, imgname.length - 1 - 1);
        let size = numberfyOrError(imgname.substring(imgname.length - 1, imgname.length));
        // такой изврат с приведением из за компилера. надо чтобы работало
        let type = UnitTypes[img] ? UnitTypes[img] : UnitTypes.unknown;
        if (type == UnitTypes.unknown)
            throw new Error("Не описан тип юнита " + img);
        //let unit: IUnit = { subid: subid, name: name, size: size, type: type, city: city };
        // эффективность может быть "не известна" для новых юнитов значит не будет прогресс бара
        let $td = $html.find("table.infoblock tr:contains('Эффективность работы') td.progress_bar").next("td");
        let eff = $td.length > 0 ? numberfyOrError($td.text(), -1) : 0;
        return {
            subid: subid,
            name: name,
            type: type,
            size: size,
            city: city,
            img: img,
            efficiency: eff
        };
    }
    function ware(size) {
        let $info = oneOrError($html, "table.infoblock");
        // строк со спецехой находит несколько по дефолту
        let spec = oneOrError($info, "tr:contains('Специализация'):last() td:last()").text().trim();
        let str = oneOrError($info, "tr:contains('Процент заполнения') td:last()").text();
        let filling = numberfyOrError(str, -1);
        let capacity = 10000;
        switch (size) {
            case 1:
                capacity = 10000;
                break;
            case 2:
                capacity = 50000;
                break;
            case 3:
                capacity = 100000;
                break;
            case 4:
                capacity = 500000;
                break;
            case 5:
                capacity = 1000000;
                break;
            case 6:
                capacity = 5 * 1000000;
                break;
            case 7:
                capacity = 50 * 1000000;
                break;
            case 8:
                capacity = 500 * 1000000;
                break;
            default:
                throw new Error("неизвестный размер склада " + size);
        }
        // спарсим строки с товаром на складе
        // товар которго нет на складе но есть заказ, будет отображаться на складе с прочерками или нулями
        let $tbl = oneOrError($html, "table.grid");
        let $rows = closestByTagName($tbl.find("img"), "tr");
        let dict = {};
        $rows.each((i, el) => {
            let $r = $(el);
            let $tds = $r.children("td");
            let img = $tds.eq(0).find("img").attr("src");
            let awail = numberfyOrError($tds.eq(1).text(), -1);
            let quality = awail > 0 ? numberfyOrError($tds.eq(2).text()) : 0;
            let price = awail > 0 ? numberfyOrError($tds.eq(3).text()) : 0;
            let n = numberfy($tds.eq(4).text());
            let sellPrice = n > 0 ? n : 0;
            dict[img] = {
                stock: {
                    available: awail,
                    product: { quality: quality, price: price, brand: 0 },
                },
                sellPrice: sellPrice,
                inOrdered: numberfyOrError($tds.eq(6).text(), -1),
                inDeliver: numberfyOrError($tds.eq(7).text(), -1),
                outOrdered: numberfyOrError($tds.eq(5).text(), -1),
                outDeliver: numberfyOrError($tds.eq(8).text(), -1),
                filling: numberfyOrError($tds.eq(9).text(), -1)
            };
        });
        return {
            filling: filling,
            specialization: spec,
            capacity: capacity,
            dashboard: dict
        };
    }
    function shop() {
        let $info = $html.find("table.infoblock"); // Район города  Расходы на аренду
        // общая инфа
        let place = $info.find("td.title:contains(Район города)").next("td").text().split(/\s+/)[0].trim();
        let rent = numberfyOrError($info.find("td.title:contains(Расходы на аренду)").next("td").text());
        let depts = numberfyOrError($info.find("td.title:contains(Количество отделов)").next("td").text(), -1);
        // число рабов и требования
        let str = $info.find("td.title:contains(Количество сотрудников)").next("td").text();
        let employees = numberfyOrError(str.split("(")[0], -1); //0 может быть но всегда есть число
        let employeesReq = numberfyOrError(str.split("~")[1], -1);
        str = $info.find("td.title:contains(Эффективность персонала)").next("td").text();
        let inHoliday = $info.find("img[src='/img/icon/holiday.gif']").length > 0;
        let employeesEff = inHoliday ? 0 : numberfyOrError(str, -1);
        // число посов может вообще отсутствовать как и сервис
        let visitors = 0;
        let service = ServiceLevels.none;
        let $td = $info.find("td.title:contains(Количество посетителей)").next("td");
        if ($td.length > 0) {
            visitors = numberfyOrError($td.text(), -1);
            let $hint = $td.closest("tr").next("tr").find("div.productivity_hint div.title");
            if ($hint.length <= 0)
                throw new Error("не нашли уровень сервиса");
            service = serviceFromStrOrError($hint.text());
        }
        return {
            place: place,
            rent: rent,
            departments: depts,
            employees: { employees: employees, required: employeesReq, efficiency: employeesEff, holidays: inHoliday },
            service: service,
            visitors: visitors
        };
    }
    function fuel() {
        let $info = $html.find("table.infoblock"); // Район города  Расходы на аренду
        // общая инфа
        let rent = numberfyOrError($info.find("td.title:contains(Расходы на аренду)").next("td").text());
        // число рабов и требования
        let str = $info.find("td.title:contains(Количество сотрудников)").next("td").text();
        let employees = numberfyOrError(str.split("(")[0], -1); //0 может быть но всегда есть число
        let employeesReq = numberfyOrError(str.split("требуется")[1], -1);
        str = $info.find("td.title:contains(Эффективность персонала)").next("td").text();
        let inHoliday = $info.find("img[src='/img/icon/holiday.gif']").length > 0;
        let employeesEff = inHoliday ? 0 : numberfyOrError(str, -1);
        // число посов может вообще отсутствовать как и сервис
        let visitors = 0;
        let service = ServiceLevels.none;
        let $td = $info.find("td.title:contains(Количество посетителей)").next("td");
        if ($td.length > 0)
            visitors = numberfyOrError($td.text(), -1);
        $td = $info.find("td.title:contains(Уровень сервиса)").next("td");
        if ($td.length > 0)
            service = serviceFromStrOrError($td.text());
        return {
            employees: { employees: employees, required: employeesReq, efficiency: employeesEff, holidays: inHoliday },
            rent: rent,
            visitors: visitors,
            service: service,
            equipment: equipment()
        };
    }
    function equipment() {
        let $info = $html.find("table.infoblock"); // Район города  Расходы на аренду
        // Количество оборудования
        let str = $info.find("td.title:contains(Количество оборудования)").next("td").text();
        let n = extractIntPositive(str);
        if (n == null || n.length < 2)
            throw new Error("не нашли оборудование");
        let equipment = n[0];
        let equipmentMax = n.length > 1 ? n[1] : 0;
        // если оборудования нет, то ничего не будет кроме числа 0
        if (equipment === 0)
            return {
                equipment: equipment,
                equipmentMax: equipmentMax,
                quality: 0,
                qualityRequired: 0,
                brokenPct: 0,
                brokenBlack: 0,
                brokenRed: 0,
                efficiency: 0
            };
        // Качество оборудования
        // 8.40 (требуется по технологии 1.00)
        // или просто 8.40 если нет требований
        str = $info.find("td.title:contains(Качество оборудования)").next("td").text();
        n = extractFloatPositive(str);
        if (n == null)
            throw new Error("не нашли кач оборудование");
        let quality = n[0];
        let qualityReq = n.length > 1 ? n[1] : 0;
        // Износ оборудования
        // красный и черный и % износа
        // 1.28 % (25+1 ед.)
        // 0.00 % (0 ед.)
        str = $info.find("td.title:contains(Износ оборудования)").next("td").text();
        let items = str.split("%");
        let brokenPct = numberfyOrError(items[0], -1);
        n = extractIntPositive(items[1]);
        if (n == null)
            throw new Error("не нашли износ оборудования");
        let brokenBlack = n[0]; // черный есть всегда 
        let brokenRed = n.length > 1 ? n[1] : 0; // красный не всегда
        // Эффективность оборудования
        str = $info.find("td.title:contains(Эффективность оборудования)").next("td").text();
        let equipEff = numberfyOrError(str, -1);
        return {
            equipment: equipment,
            equipmentMax: equipmentMax,
            quality: quality,
            qualityRequired: qualityReq,
            brokenPct: brokenPct,
            brokenBlack: brokenBlack,
            brokenRed: brokenRed,
            efficiency: equipEff
        };
    }
    function employees() {
        let $block = $html.find("table.infoblock");
        // Количество рабочих. может быть 0 для складов.
        // Возможные варианты для рабочих будут
        // 10(требуется ~ 1)
        // 10(максимум:1)
        // 1 000 (максимум:10 000) пробелы в числах!!
        // 10 ед. (максимум:1) это уже не включать
        let employees = 0;
        let employeesReq = 0;
        //let types = ["сотрудников", "работников", "учёных", "рабочих"];
        //let $r = $block.find(`td.title:contains(Количество сотрудников), 
        //                      td.title:contains(Количество работников),
        //                      td.title:contains(Количество учёных),
        //                      td.title:contains(Количество рабочих)`);
        //let empl = (() => {
        //    // Возможные варианты для рабочих будут
        //    // 10(требуется ~ 1)
        //    // 10(максимум:1)
        //    // 10 ед. (максимум:1) это уже не включать
        //    // 1 000 (максимум:10 000) пробелы в числах!!
        //    let types = ["сотрудников", "работников", "учёных", "рабочих"];
        //    let res = [-1, -1];
        //    //let emplRx = new RegExp(/\d+\s*\(.+\d+.*\)/g);
        //    //let td = jq.next("td").filter((i, el) => emplRx.test($(el).text()));
        //    let jq = $block.find('td.title:contains("Количество")').filter((i, el) => {
        //        return types.some((t, i, arr) => $(el).text().indexOf(t) >= 0);
        //    });
        //    if (jq.length !== 1)
        //        return res;
        //    // например в лаборатории будет находить вместо требований, так как их нет, макс число рабов в здании
        //    let m = jq.next("td").text().replace(/\s*/g, "").match(rxInt);
        //    if (!m || m.length !== 2)
        //        return res;
        //    return [parseFloat(m[0]), parseFloat(m[1])];
        //})();
        //let _employees = empl[0];
        //let _employeesReq = empl[1];
        //// общее число подчиненных по профилю
        //let _totalEmployees = numberfy($block.find('td:contains("Суммарное количество подчинённых")').next("td").text());
        //let salary = (() => {
        //    //let rx = new RegExp(/\d+\.\d+.+в неделю\s*\(в среднем по городу.+?\d+\.\d+\)/ig);
        //    let jq = $block.find('td.title:contains("Зарплата")').next("td");
        //    if (jq.length !== 1)
        //        return ["-1", "-1"];
        //    let m = jq.text().replace(/\s*/g, "").match(rxFloat);
        //    if (!m || m.length !== 2)
        //        return ["-1", "-1"];
        //    return m;
        //})();
        //let _salaryNow = numberfy(salary[0]);
        //let _salaryCity = numberfy(salary[1]);
        //let skill = (() => {
        //    let jq = $block.find('td.title:contains("Уровень квалификации")').next("td");
        //    if (jq.length !== 1)
        //        return ["-1", "-1", "-1"];
        //    // возможные варианты результата
        //    // 10.63 (в среднем по городу 9.39, требуется по технологии 6.74)
        //    // 9.30(в среднем по городу 16.62 )
        //    let m = jq.text().match(rxFloat);
        //    if (!m || m.length < 2)
        //        return ["-1", "-1", "-1"];
        //    return [m[0], m[1], m[2] || "-1"];
        //})();
        //let _skillNow = numberfy(skill[0]);
        //let _skillCity = numberfy(skill[1]);
        //let _skillReq = numberfy(skill[2]);     // для лаб требования может и не быть
    }
    function serviceFromStrOrError(str) {
        switch (str.toLowerCase()) {
            case "элитный":
                return ServiceLevels.elite;
            case "очень высокий":
                return ServiceLevels.higher;
            case "высокий":
                return ServiceLevels.high;
            case "нормальный":
                return ServiceLevels.normal;
            case "низкий":
                return ServiceLevels.low;
            case "очень низкий":
                return ServiceLevels.lower;
            case "не известен":
                return ServiceLevels.none;
            default:
                throw new Error("Не смог идентифицировать указанный уровень сервиса " + str);
        }
    }
}
/**
 * /lien/main/unit/view/4152881/finans_report
 * @param html
 * @param url
 */
function parseUnitFinRep(html, url) {
    let $html = $(html);
    try {
        let res = [];
        // если в таблице нет данных, например только создали магазин, тогда не будет th заголовков.
        let $tbl = oneOrError($html, "table.treport");
        if ($tbl.find("th").length <= 0)
            return res;
        let $rows = $tbl.find("tr");
        // в лабораториях и других подобных юнитах есть тока расходы, а остальное отсутсвтует вообще строки
        let $header = $rows.eq(0);
        let $incom = $rows.filter(":contains('Доходы')");
        let $profit = $rows.filter(":contains('Прибыль')");
        let $tax = $rows.filter(":contains('Налоги')");
        let $expense = $rows.filter(":contains('Расходы')");
        if ($expense.length <= 0)
            throw new Error("Статья расходов не найдена. А она обязана быть");
        for (let i of [1, 2, 3, 4]) {
            let date = extractDate($header.children().eq(i).text());
            if (date == null)
                throw new Error("не могу извлечь дату из заголовка" + $header.children().eq(i).html());
            res.push([date, {
                    income: $incom.length > 0 ? numberfyOrError($incom.children().eq(i).text(), -1) : 0,
                    expense: numberfyOrError($expense.children().eq(i).text(), -1),
                    profit: $profit.length > 0 ? numberfy($profit.children().eq(i).text()) : 0,
                    tax: $tax.length > 0 ? numberfyOrError($tax.children().eq(i).text(), -1) : 0
                }]);
        }
        return res;
    }
    catch (err) {
        logDebug(`error on ${url}`);
        throw err;
    }
}
/**
 * Чисто размер складов вида https://virtonomica.ru/fast/window/unit/upgrade/8006972
 * @param html
 * @param url
 */
function parseWareResize(html, url) {
    let $html = $(html);
    try {
        let sz = [];
        let rent = [];
        let id = [];
        $html.find(":radio").closest("tr").each((i, el) => {
            let $r = $(el);
            let $tds = $r.children("td");
            let txt = $tds.eq(1).text();
            if (txt.indexOf("тыс") >= 0)
                sz.push(numberfyOrError(txt) * 1000);
            else if (txt.indexOf("млн") >= 0)
                sz.push(numberfyOrError(txt) * 1000000);
            else if (txt.indexOf("терминал") >= 0)
                sz.push(500 * 1000000);
            rent.push(numberfyOrError($tds.eq(2).text()));
            id.push(numberfyOrError($tds.eq(0).find(":radio").val()));
        });
        return {
            capacity: sz,
            rent: rent,
            id: id
        };
    }
    catch (err) {
        throw new ParseError("ware size", url, err);
    }
}
/**
 * Главная страница склада аналогично обычной главной юнита /main/unit/view/ + subid
 * @param html
 * @param url
 */
function parseWareMain(html, url) {
    let $html = $(html);
    try {
        if ($html.find("#unitImage img").attr("src").indexOf("warehouse") < 0)
            throw new Error("Это не склад!");
        let _size = $html.find(".infoblock td:eq(1)").map((i, e) => {
            let txt = $(e).text();
            let sz = numberfyOrError(txt);
            if (txt.indexOf("тыс") >= 0)
                sz *= 1000;
            if (txt.indexOf("млн") >= 0)
                sz *= 1000000;
            return sz;
        }).get();
        let _full = (() => {
            let f = $html.find("[nowrap]:eq(0)").text().trim();
            if (f === "")
                throw new Error("ware full not found");
            return numberfy(f);
        })();
        let _product = $html.find(".grid td:nth-child(1)").map((i, e) => $(e).text()).get();
        let _stock = $html.find(".grid td:nth-child(2)").map((i, e) => numberfy($(e).text())).get();
        let _shipments = $html.find(".grid td:nth-child(6)").map((i, e) => numberfy($(e).text())).get();
        return {
            size: _size,
            full: _full,
            product: _product,
            stock: _stock,
            shipments: _shipments
        };
    }
    catch (err) {
        throw new ParseError("ware main", url, err);
    }
}
/**
 * Снабжение склада
   [[товар, контракты[]], товары внизу страницы без контрактов]
   возможно что будут дубли id товара ведь малиновый пиджак и простой имеют общий id
 * @param html
 * @param url
 */
function parseWareSupply(html, url) {
    let $html = $(html);
    try {
        // для 1 товара может быть несколько поставщиков, поэтому к 1 продукту будет идти массив контрактов
        let $rows = $html.find("tr.p_title");
        // парсинг товаров на которые есть заказы
        let res = [];
        $rows.each((i, el) => {
            let $r = $(el); // это основной ряд, после него еще будут ряды до следующего это контракты
            let $subs = $r.nextUntil("tr.p_title").has("div.del_contract");
            if ($subs.length <= 0)
                throw new Error("есть строка с товаром но нет поставщиков. такого быть не может.");
            // собираем продукт
            let id = (() => {
                let href = oneOrError($r, "td.p_title_l a:eq(1)").attr("href");
                let n = extractIntPositive(href);
                if (n == null || n.length !== 3)
                    throw new Error(`в ссылке ${href} должно быть 3 числа`);
                return n[2];
            })();
            let $img = oneOrError($r, "div.product_img img");
            let product = {
                id: id,
                img: $img.attr("src"),
                name: $img.attr("title")
            };
            // для ТМ учитываем факт ТМности
            let tmImg = isTM(product) ? product.img : "";
            // собираем контракты
            let contracts = [];
            $subs.each((i, el) => {
                let $r = $(el);
                // контракт
                let offerID = numberfyOrError(oneOrError($r, "input[name='multipleDestroy[]']").val());
                // ячейка где чекбокс и линки на компанию и юнит
                let $div = oneOrError($r, "div.del_contract").next("div");
                let isIndep = $div.find("img[src='/img/unit_types/seaport.gif']").length > 0;
                let subid = 0;
                let unitName = "независимый поставщик";
                let companyName = "независимый поставщик";
                let self = false;
                if (!isIndep) {
                    // subid юнита
                    let $a = oneOrError($div, "a[href*='/unit/']");
                    let numbers = extractIntPositive($a.attr("href"));
                    if (numbers == null || numbers.length !== 1)
                        throw new Error("не смог взять subid юнита из ссылки " + url);
                    subid = numbers[0];
                    // имя юнита
                    unitName = $a.text();
                    if (unitName.length <= 0)
                        throw new Error(`имя поставщика юнит ${subid} не спарсилось`);
                    // для чужих складов имя идет линком, а для своих выделено strong тегом
                    $a = $div.find("a[href*='/company/']");
                    if ($a.length === 1)
                        companyName = $a.text();
                    else if ($a.length > 1)
                        throw new Error(`нашли ${$a.length} ссылок на компанию вместо 1`);
                    else {
                        companyName = oneOrError($div, "strong").text();
                        self = true;
                    }
                }
                // ограничения контракта и заказ
                // 
                let str = oneOrError($r, "input[name^='supplyContractData[party_quantity]']").val();
                let ordered = numberfyOrError(str, -1);
                let ctype;
                let val = oneOrError($r, "input[name^='supplyContractData[constraintPriceType]']").val();
                switch (val) {
                    case "Rel":
                        ctype = ConstraintTypes.Rel;
                        break;
                    case "Abs":
                        ctype = ConstraintTypes.Abs;
                        break;
                    default:
                        throw new Error("неизвестный тип ограничения контракта " + val);
                }
                // должно быть 0 или больше
                let cminQ = numberfyOrError($r.find("input[name^='supplyContractData[quality_constraint_min]']").val(), -1);
                let maxPrice = numberfyOrError($r.find("input[name^='supplyContractData[price_constraint_max]']").val(), -1);
                let relPriceMarkUp = numberfyOrError($r.find("input[name^='supplyContractData[price_mark_up]']").val(), -1);
                // состояние склада поставщика
                //
                // первая строка может быть либо число либо "323 из 34345345"
                // вторя строка всегда число или 0
                // для независа будет "не огран"
                let total = Number.MAX_SAFE_INTEGER;
                let available = Number.MAX_SAFE_INTEGER;
                let maxLimit = 0;
                let purchased = numberfyOrError($r.find("td.num:eq(0)").text(), -1);
                if (!isIndep) {
                    let $td = oneOrError($r, "td.num:eq(6) span");
                    let items = getOnlyText($td);
                    if (items.length != 2)
                        throw new Error("ошибка извлечения Доступно/Всего со склада");
                    total = numberfyOrError(items[1], -1);
                    let n = extractIntPositive(items[0]);
                    if (n == null || n.length > 2)
                        throw new Error("ошибка извлечения Доступно/Всего со склада");
                    [available, maxLimit] = n.length > 1 ? [n[1], n[0]] : [n[0], 0];
                }
                // характеристики товара поставщика
                //
                // если поставщик поднял цену, тогда новая цена будет второй и по факту это цена контракта.
                // нельзя заключать контракт по старой цене уже. и при обновлении поставок надо ориентироваться на новую цену
                let price = 0;
                let quality = 0;
                let brand = 0; // бренда на складе не показывает вообще
                if (total > 0) {
                    let n = extractFloatPositive($r.children("td.num").eq(1).text());
                    if (n == null || n.length > 2)
                        throw new Error("не найдена цена товара");
                    price = n.length > 1 ? n[1] : n[0];
                    quality = numberfyOrError($r.children("td.num").eq(3).text());
                }
                contracts.push({
                    offer: {
                        id: offerID,
                        unit: { subid: subid, type: UnitTypes.unknown, name: unitName, size: 0, city: "" },
                        maxLimit: maxLimit > 0 ? maxLimit : null,
                        stock: {
                            available: available,
                            total: total,
                            purchased: purchased,
                            product: { price: price, quality: quality, brand: brand }
                        },
                        companyName: companyName,
                        isIndependend: isIndep,
                        self: self,
                        tmImg: tmImg
                    },
                    ordered: ordered,
                    constraints: {
                        type: ctype,
                        minQuality: cminQ,
                        price: maxPrice,
                        priceMarkUp: relPriceMarkUp
                    }
                });
            });
            res.push([product, contracts]);
        });
        // парсинг товаров внизу на которые заказов нет
        let $items = $html.find("div.add_contract");
        let arr = [];
        $items.each((i, el) => {
            let $div = $(el);
            let $img = oneOrError($div, "img");
            let img = $img.attr("src");
            let name = $img.attr("alt");
            let $a = $img.closest("a");
            let n = extractIntPositive($a.attr("href"));
            if (n == null || n.length != 3)
                throw new Error("не нашли id товара " + img);
            let id = n[2];
            arr.push({ id: id, img: img, name: name });
        });
        return [res, arr];
    }
    catch (err) {
        throw err;
    }
}
/**
 * Страница смены спецухи для склада.
 * /olga/window/unit/speciality_change/6835788
    [id, название, выделена?]
 * @param html
 * @param url
 */
function parseWareChangeSpec(html, url) {
    let $html = $(html);
    let res = [];
    try {
        let $rows = $html.find("table.list").find("tr.even,tr.odd");
        if ($rows.length <= 0)
            throw new Error("Не найдено ни одной специализации");
        $rows.each((i, el) => {
            let $r = $(el);
            let $radio = oneOrError($r, "input");
            let cat = parseInt($radio.val());
            let name = $r.children("td").eq(1).text();
            let checked = $radio.prop("checked");
            res.push([cat, name, checked]);
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
/**
 * все продавцы данного продукта ВООБЩЕ /"+realm+"/main/globalreport/marketing/by_products/"+mapped[url].productId[i]
 * @param html
 * @param url
 */
function parseProductReport(html, url) {
    let $html = $(html);
    try {
        let $rows = $html.find(".grid").find("tr.odd, tr.even");
        // Макс ограничение на контракт. -1 если без.
        let _max = $rows.find("td.nowrap:nth-child(2)").map((i, e) => {
            let $span = $(e).find("span");
            if ($span.length !== 1)
                return -1;
            return numberfy($span.text().split(":")[1]);
        }).get();
        // общее число на складе. может быть 0
        let _total = $rows.find("td.nowrap:nth-child(2)").map((i, e) => {
            let txt = $(e).clone().children().remove().end().text().trim();
            if (txt.length === 0)
                throw new Error("total amount not found");
            return numberfy(txt);
        }).get();
        let _available = $rows.find("td.nowrap:nth-child(3)").map((i, e) => numberfy($(e).text())).get();
        // не могут быть 0 по определению
        let _quality = $rows.find("td.nowrap:nth-child(4)").map((i, e) => numberfyOrError($(e).text())).get();
        let _price = $rows.find("td.nowrap:nth-child(5)").map((i, e) => numberfyOrError($(e).text())).get();
        // может быть независимый поставщик БЕЗ id. для таких будет -1 id
        let _subid = $rows.find("td:nth-child(1) td:nth-child(1)").map((i, e) => {
            let jq = $(e).find("a");
            if (jq.length !== 1)
                return -1;
            let m = jq.attr("href").match(/\d+/);
            return numberfy(m ? m[0] : "-1");
        }).get();
        return {
            max: _max,
            total: _total,
            available: _available,
            quality: _quality,
            price: _price,
            subid: _subid
        };
    }
    catch (err) {
        throw new ParseError("product report", url, err);
    }
}
/**
 * "/"+realm+"/main/company/view/"+companyid+"/unit_list/employee/salary"
 * @param html
 * @param url
 */
function parseEmployees(html, url) {
    let $html = $(html);
    try {
        let $rows = $html.find("table.list").find(".u-c").map((i, e) => $(e).closest("tr").get());
        let _id = $rows.find(":checkbox").map((i, e) => numberfyOrError($(e).val())).get();
        // может быть 0 в принципе
        let _salary = $rows.find("td:nth-child(7)").map((i, e) => {
            let txt = getInnerText(e).trim();
            if (txt.length === 0)
                throw new Error("salary not found");
            return numberfy(txt);
        }).get();
        // не может быть 0
        let _salaryCity = $rows.find("td:nth-child(8)").map((i, e) => {
            let txt = getInnerText(e).trim(); // тут низя удалять ничо. внутри какой то инпут сраный и в нем текст
            if (txt.length === 0)
                throw new Error("salary city not found");
            return numberfyOrError(txt);
        }).get();
        // может быть 0
        let _skill = $rows.find("td:nth-child(9)").map((i, e) => {
            let txt = $(e).text().trim(); // может быть a тег внутри. поэтому просто текст.
            if (txt.length === 0)
                throw new Error("skill not found");
            return numberfy(txt);
        }).get();
        let _skillRequired = $rows.find("td:nth-child(10)").map((i, e) => {
            let txt = $(e).text().trim(); // может быть a тег внутри. поэтому просто текст.
            if (txt.length === 0)
                throw new Error("skill not found");
            return numberfy(txt);
        }).get();
        let _onHoliday = $rows.find("td:nth-child(11)").map((i, e) => !!$(e).find(".in-holiday").length).get();
        // может отсутстовать если мы в отпуске -1 будет
        let _efficiency = $rows.find("td:nth-child(11)").map((i, e) => {
            let txt = getInnerText(e).trim();
            return numberfy(txt || "-1");
        }).get();
        return {
            id: _id,
            salary: _salary,
            salaryCity: _salaryCity,
            skill: _skill,
            skillRequired: _skillRequired,
            onHoliday: _onHoliday,
            efficiency: _efficiency
        };
    }
    catch (err) {
        throw new ParseError("ware size", url, err);
    }
}
function parseTradeHallOld(html, url) {
    let $html = $(html);
    try {
        let _history = $html.find("a.popup").map(function (i, e) { return $(e).attr("href"); }).get();
        let _report = $html.find(".grid a:has(img):not(:has(img[alt]))").map(function (i, e) { return $(e).attr("href"); }).get();
        let _img = $html.find(".grid a img:not([alt])").map(function (i, e) { return $(e).attr("src"); }).get();
        // "productData[price][{37181683}]" а не то что вы подумали
        let _name = $html.find(":text").map((i, e) => {
            let nm = $(e).attr("name").trim();
            if (nm.length === 0)
                throw new Error("product name not found");
            return nm;
        }).get();
        let _stock = $html.find(".nowrap:nth-child(6)").map((i, e) => {
            return numberfy($(e).text());
        }).get();
        let _deliver = $html.find(".nowrap:nth-child(5)").map(function (i, e) { return numberfy($(e).text().split("[")[1]); }).get();
        let _quality = $html.find("td:nth-child(7)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _purch = $html.find("td:nth-child(9)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _price = $html.find(":text").map(function (i, e) { return numberfy($(e).val()); }).get();
        let _share = $html.find(".nowrap:nth-child(11)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _cityprice = $html.find("td:nth-child(12)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _cityquality = $html.find("td:nth-child(13)").map(function (i, e) { return numberfy($(e).text()); }).get();
        if (_history.length !== _share.length)
            throw new Error("что то пошло не так. Количество данных различается");
        return {
            historyUrl: _history,
            reportUrl: _report,
            history: [],
            report: [],
            img: _img,
            name: _name,
            stock: _stock,
            deliver: _deliver,
            quality: _quality,
            purch: _purch,
            price: _price,
            share: _share,
            cityprice: _cityprice,
            cityquality: _cityquality
        };
    }
    catch (err) {
        throw new ParseError("trading hall", url, err);
    }
}
/**
 * \/.*\/main\/unit\/view\/[0-9]+\/trading_hall$
   сначала заполнение склада, потом товары
 * @param html
 * @param url
 */
function parseTradeHall(html, url) {
    let $html = $(html);
    try {
        let str = oneOrError($html, "table.list").find("div").eq(0).text().trim();
        let filling = numberfyOrError(str, -1);
        let $rows = closestByTagName($html.find("a.popup"), "tr");
        let thItems = [];
        $rows.each((i, el) => {
            let $r = $(el);
            let $tds = $r.children("td");
            let cityRepUrl = oneOrError($tds.eq(2), "a").attr("href");
            let historyUrl = oneOrError($r, "a.popup").attr("href");
            // продукт
            // картинка может быть просто от /products/ так и ТМ /products/brand/ типа
            let img = oneOrError($tds.eq(2), "img").attr("src");
            let nums = extractIntPositive(cityRepUrl);
            if (nums == null)
                throw new Error("не получилось извлечь id продукта из ссылки " + cityRepUrl);
            let prodID = nums[0];
            let prodName = $tds.eq(2).attr("title").split("(")[0].trim();
            let product = { id: prodID, img: img, name: prodName };
            // склад. может быть -- вместо цены, кач, бренд так что -1 допускается
            let stock = {
                available: numberfyOrError($tds.eq(5).text(), -1),
                deliver: numberfyOrError($tds.eq(4).text().split("[")[1], -1),
                sold: numberfyOrError(oneOrError($tds.eq(3), "a.popup").text(), -1),
                ordered: numberfyOrError(oneOrError($tds.eq(4), "a").text(), -1),
                product: {
                    price: numberfy($tds.eq(8).text()),
                    quality: numberfy($tds.eq(6).text()),
                    brand: numberfy($tds.eq(7).text())
                }
            };
            // прочее "productData[price][{37181683}]" а не то что вы подумали
            let $input = oneOrError($tds.eq(9), "input");
            let name = $input.attr("name");
            let currentPrice = numberfyOrError($input.val(), -1);
            let dontSale = $tds.eq(9).find("span").text().indexOf("продавать") >= 0;
            // среднегородские цены
            let share = numberfyOrError($tds.eq(10).text(), -1);
            let city = {
                price: numberfyOrError($tds.eq(11).text()),
                quality: numberfyOrError($tds.eq(12).text()),
                brand: numberfyOrError($tds.eq(13).text(), -1)
            };
            thItems.push({
                product: product,
                stock: stock,
                price: currentPrice,
                city: city,
                share: share,
                historyUrl: historyUrl,
                reportUrl: cityRepUrl,
                name: name,
                dontSale: dontSale
            });
        });
        return [filling, thItems];
    }
    catch (err) {
        throw err;
    }
}
// буквы большие обязательны. иначе не работает отправка на сервер
var ConstraintTypes;
(function (ConstraintTypes) {
    ConstraintTypes[ConstraintTypes["Abs"] = 0] = "Abs";
    ConstraintTypes[ConstraintTypes["Rel"] = 1] = "Rel";
})(ConstraintTypes || (ConstraintTypes = {}));
/**
 * Снабжение магазина
 * @param html
 * @param url
 */
function parseRetailSupply(html, url) {
    let $html = $(html);
    try {
        //  по идее на 1 товар может быть несколько поставщиков и следовательно парселов будет много а стока мало
        // парсить оно будет, но потом где при обработке данных будет жаловаться и не отработает
        // ячейка для ввода количества штук 
        let _parcel = $html.find("input:text[name^='supplyContractData[party_quantity]']").map(function (i, e) { return numberfy($(e).val()); }).get();
        // тип ограничения заказа абс или процент
        let _price_constraint_type = $html.find("select[name^='supplyContractData[constraintPriceType]']").map(function (i, e) { return $(e).val(); }).get();
        // если задан процент то будет номер опции селекта. иначе 0
        let _price_mark_up = $html.find("select[name^='supplyContractData[price_mark_up]']").map(function (i, e) { return numberfy($(e).val()); }).get();
        // макс ограничение по цене если задан абс вариант ограничения. будет 0 если в процентах
        let _price_constraint_max = $html.find("input[name^='supplyContractData[price_constraint_max]']").map(function (i, e) { return numberfy($(e).val()); }).get();
        let _quality_constraint_min = $html.find("input[name^='supplyContractData[quality_constraint_min]']").map(function (i, e) { return numberfy($(e).val()); }).get();
        let _deliver = $html.find("td.nowrap:nth-child(4)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _stock = $html.find("td:nth-child(2) table:nth-child(1) tr:nth-child(1) td:nth-child(2)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _sold = $html.find("td:nth-child(2) table:nth-child(1) tr:nth-child(5) td:nth-child(2)").map(function (i, e) { return numberfy($(e).text()); }).get();
        // чекбокс данного поставщика
        let _offer = $html.find(".destroy").map(function (i, e) { return numberfy($(e).val()); }).get();
        let _price = $html.find("td:nth-child(9) table:nth-child(1) tr:nth-child(1) td:nth-child(2)").map(function (i, e) { return numberfy($(e).text()); }).get();
        // есть ли изменение цены
        let _reprice = $html.find("td:nth-child(9) table:nth-child(1) tr:nth-child(1) td:nth-child(2)").map((i, e) => {
            return !!$(e).find("div").length;
        }).get();
        let _quality = $html.find("td:nth-child(9) table:nth-child(1) tr:nth-child(2) td:nth-child(2)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _available = $html.find("td:nth-child(10) table:nth-child(1) tr:nth-child(3) td:nth-child(2)").map(function (i, e) { return numberfy($(e).text()); }).get();
        let _img = $html.find(".noborder td > img").map(function (i, e) { return $(e).attr("src"); }).get();
        return {
            parcel: _parcel,
            price_constraint_type: _price_constraint_type,
            price_mark_up: _price_mark_up,
            price_constraint_max: _price_constraint_max,
            quality_constraint_min: _quality_constraint_min,
            deliver: _deliver,
            stock: _stock,
            sold: _sold,
            offer: _offer,
            price: _price,
            reprice: _reprice,
            quality: _quality,
            available: _available,
            img: _img
        };
    }
    catch (err) {
        throw new ParseError("store supply", url, err);
    }
}
function parseRetailSupplyNew(html, url) {
    let $html = $(html);
    try {
        // для 1 товара может быть несколько поставщиков, поэтому к 1 продукту будет идти массив контрактов
        let $rows = $html.find("tr.product_row");
        let res = [];
        $rows.each((i, el) => {
            let $r = $(el); // это основной ряд, но если контрактов несколько то будут еще субряды
            let $subs = $r.nextUntil("tr.product_row", "tr.sub_row");
            // собираем продукт
            let id = (() => {
                let items = $r.prop("id").split("_"); // product_row_422200-0
                items = items[2].split("-"); // 422200-0
                let res = numberfyOrError(items[0]);
                return res;
            })();
            let img = oneOrError($r, "th img:eq(0)").attr("src");
            let product = { id: id, img: img, name: "" };
            // для ТМ учитываем факт ТМности
            let tmImg = isTM(product) ? img : "";
            // собираем текущее состояние склада
            let stock = $r.children("td").eq(0).map((i, el) => {
                let $td = $(el);
                // если склад пуст, то количество будет 0, продано 0, а остальные показатели будут прочерки, то есть спарсит -1
                let quantity = numberfy($td.find("td:contains('Количество')").next("td").text());
                let price = numberfy($td.find("td:contains('Себестоимость')").next("td").text());
                let quality = numberfy($td.find("td:contains('Качество')").next("td").text());
                let brand = numberfy($td.find("td:contains('Бренд')").next("td").text());
                let sold = numberfyOrError($td.find("td:contains('Продано')").next("td").text(), -1);
                let deliver = numberfyOrError($td.next("td").next("td").text(), -1);
                let ordered = numberfyOrError($td.next("td").text(), -1);
                return {
                    available: quantity,
                    sold: sold,
                    deliver: deliver,
                    ordered: ordered,
                    product: { price: price, quality: quality, brand: brand }
                };
            }).get(0);
            // собираем контракты
            let contracts = $r.add($subs).map((i, el) => {
                let $r = $(el);
                // контракт, имя юнита и его айди
                //
                let offerID = numberfyOrError(oneOrError($r, "input.destroy").val());
                let $td = oneOrError($r, `td[id^=name_${product.id}]`);
                let url = oneOrError($td, "a[href*='/unit/']").attr("href");
                let numbers = extractIntPositive(url);
                if (!numbers || numbers.length !== 1)
                    throw new Error("не смог взять subid юнита из ссылки " + url);
                let subid = numbers[0];
                // если имя юнита короткое, оно сразу в <a> теге, иначе добавляется внутрь span с титлом
                // так же дело обстоит и с компанией
                let $a = oneOrError($td, "a[href*='/unit/']");
                let $span = $a.find("span");
                let unitName = $span.length ? $span.attr("title") : $a.text();
                if (unitName.length <= 0)
                    throw new Error(`имя поставщика юнит ${subid} не спарсилось`);
                // для чужих магов имя идет линком, а для своих выделено strong тегом
                let self = false;
                let companyName = "";
                $a = $td.find("a[href*='/company/']");
                if ($a.length === 1) {
                    $span = $a.find("span");
                    companyName = $span.length ? $span.attr("title") : $a.text();
                }
                else if ($a.length > 1)
                    throw new Error(`нашли ${$a.length} ссылок на компанию вместо 1`);
                else {
                    companyName = oneOrError($td, "strong").text();
                    self = true;
                }
                // ограничения контракта и заказ
                // 
                $td = oneOrError($r, `td[id^=quantityField_${product.id}]`);
                let ordered = numberfyOrError(oneOrError($td, "input").val(), -1);
                // ограничение по количеству
                let maxLimit = 0;
                $span = $td.find("span");
                if ($span.length) {
                    let n = extractIntPositive($span.text());
                    if (!n || !n[0])
                        throw new Error(`не смог извлеч ограничение по объему закупки из ячейки ${$td.html()}`);
                    maxLimit = n[0];
                }
                $td = oneOrError($r, `td[id^=constraint_${product.id}]`);
                let ctype;
                let val = oneOrError($td, "select.contractConstraintPriceType").val();
                switch (val) {
                    case "Rel":
                        ctype = ConstraintTypes.Rel;
                        break;
                    case "Abs":
                        ctype = ConstraintTypes.Abs;
                        break;
                    default:
                        throw new Error("неизвестный тип ограничения контракта " + val);
                }
                // должно быть 0 или больше
                let cminQ = numberfyOrError(oneOrError($td, "input[name^='supplyContractData[quality_constraint_min]']").val(), -1);
                let maxPrice = numberfyOrError(oneOrError($td, "input.contractConstraintPriceAbs").val(), -1);
                let relPriceMarkUp = numberfyOrError(oneOrError($td, "select.contractConstraintPriceRel").val(), -1);
                // характеристики его товара
                //
                $td = oneOrError($r, `td[id^=totalPrice_${product.id}]`);
                // цена кач бренд могут быть пустыми если товара у поставщика нет
                let str = oneOrError($td, "td:contains('Цена')").next("td").text();
                let n = extractFloatPositive(str);
                if (n == null)
                    throw new Error("не найдена цена продажи у " + companyName);
                // если поставщик поднял цену, тогда новая цена будет второй и по факту это цена контракта.
                // нельзя заключать контракт по старой цене уже. и при обновлении поставок надо ориентироваться на новую цену
                let price = n.length > 1 ? n[1] : n[0];
                //let price = numberfy($td.find("td:contains('Цена')").next("td").text());
                let quality = numberfy($td.find("td:contains('Качество')").next("td").text());
                let brand = numberfy($td.find("td:contains('Бренд')").next("td").text());
                // состояние склада поставщика
                //
                // все цифры должны быть 0 или больше
                let purchased = numberfyOrError(oneOrError($r, `td[id^="dispatch_quantity_${product.id}"]`).text(), -1);
                let total = numberfyOrError(oneOrError($r, `td[id^="quantity_${product.id}"]`).text(), -1);
                let available = numberfyOrError(oneOrError($r, `td[id^="free_${product.id}"]`).text(), -1);
                return {
                    offer: {
                        id: offerID,
                        unit: { subid: subid, type: UnitTypes.unknown, name: unitName, size: 0, city: "" },
                        maxLimit: maxLimit > 0 ? maxLimit : null,
                        stock: {
                            available: available,
                            total: total,
                            purchased: purchased,
                            product: { price: price, quality: quality, brand: brand }
                        },
                        companyName: companyName,
                        isIndependend: false,
                        self: self,
                        tmImg: tmImg
                    },
                    ordered: ordered,
                    constraints: {
                        type: ctype,
                        minQuality: cminQ,
                        price: maxPrice,
                        priceMarkUp: relPriceMarkUp
                    }
                };
            }).get();
            // [IProduct, [IProductProperties, number], IBuyContract[]]
            res.push([product, stock, contracts]);
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Со страницы с тарифами на энергию парсит все тарифы на энергию по всем отраслям для данного региона
 * @param html
 * @param url
 */
function parseEnergyPrices(html, url) {
    let $html = $(html);
    let res = {};
    try {
        let $rows = $html.find("tr").has("img");
        for (let i = 0; i < $rows.length; i++) {
            let $r = $rows.eq(i);
            let $tds = $r.children("td");
            let sector = $tds.eq(0).text().trim();
            let energyPrice = numberfyOrError($tds.eq(2).text().split("/")[0], -1);
            let products = parseProducts($tds.eq(1));
            if (res[sector] != null)
                throw new Error("Повторилась отрасль " + sector);
            res[sector] = { sector: sector, price: energyPrice, products: products };
        }
        return res;
    }
    catch (err) {
        throw err;
    }
    // собирает все продукты из ячейки
    function parseProducts($td) {
        let $imgs = $td.eq(0).find("img");
        let res = [];
        for (let i = 0; i < $imgs.length; i++) {
            let $pic = $imgs.eq(i);
            // название продукта Спортивное питание, Маточное молочко и так далее
            let name = $pic.attr("title").trim();
            if (name.length === 0)
                throw new Error("Имя продукта пустое.");
            // номер продукта
            let m = $pic.parent("a").attr("href").match(/\d+/);
            if (m == null)
                throw new Error("id продукта не найден");
            let id = numberfyOrError(m[0], 0); // должно быть больше 0 полюбому
            let img = $pic.attr("src");
            res.push({
                name: name,
                img: img,
                id: id
            });
        }
        return res;
    }
    ;
}
/**
 * /olga/main/common/main_page/game_info/bonuses/country
 * @param html
 * @param url
 */
function parseCountries(html, url) {
    let $html = $(html);
    try {
        let $tds = $html.find("td.geo");
        let countries = $tds.map((i, e) => {
            let $a = oneOrError($(e), "a[href*=regionlist]");
            let m = matchedOrError($a.attr("href"), /\d+/i);
            return {
                id: numberfyOrError(m, 0),
                name: $a.text().trim()
            };
        }).get();
        return countries;
    }
    catch (err) {
        throw err;
    }
}
function parseRegions(html, url) {
    let $html = $(html);
    try {
        let $rows = closestByTagName($html.find("td.geo"), "tr");
        let res = [];
        $rows.each((i, el) => {
            let $r = $(el);
            let $geo = oneOrError($r, "td.geo");
            let $a = oneOrError($geo, "a[href*=citylist]");
            let m = matchedOrError($a.attr("href"), /\d+/i);
            res.push({
                id: numberfyOrError(m, 0),
                name: $a.text().trim(),
                tax: numberfyOrError($r.children("td").eq(8).text()),
                countryName: $geo.attr("title")
            });
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
function parseCities(html, url) {
    let $html = $(html);
    try {
        let $rows = closestByTagName($html.find("td.geo"), "tr");
        let towns = $rows.map((i, e) => {
            let $r = $(e);
            let $tds = $r.children("td");
            let country = $tds.eq(0).attr("title").trim();
            if (country.length < 2)
                throw new Error("Ошибка парсинга имени страны");
            let $a = oneOrError($tds.eq(0), "a[href*=city]");
            let name = $a.text().trim();
            if (country.length < 2)
                throw new Error("Ошибка парсинга имени города");
            let str = matchedOrError($a.attr("href"), /\d+/i);
            let id = numberfyOrError(str, 0);
            return {
                id: id,
                name: name,
                countryName: country,
                population: 1000 * numberfyOrError($tds.eq(1).text(), 0),
                salary: numberfyOrError($tds.eq(2).text(), 0),
                eduLevel: numberfyOrError($tds.eq(3).text(), 0),
            };
        }).get();
        return towns;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Со странички пробуем спарсить игровую дату. А так как дата есть почти везде, то можно почти везде ее спарсить
 * Вывалит ошибку если не сможет спарсить дату со странички
 * @param html
 * @param url
 */
function parseGameDate(html, url) {
    let $html = $(html);
    try {
        // вытащим текущую дату, потому как сохранять данные будем используя ее
        let $date = $html.find("div.date_time");
        if ($date.length !== 1)
            throw new Error("Не получилось получить текущую игровую дату");
        let currentGameDate = extractDate(getOnlyText($date)[0].trim());
        if (currentGameDate == null)
            throw new Error("Не получилось получить текущую игровую дату");
        return currentGameDate;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Парсит данные по числу рабов со страницы управления персоналам в Управлении
 * @param html
 * @param url
 */
function parseManageEmployees(html, url) {
    if (html == null)
        throw new Error("страница пуста. парсить нечего");
    let $html = $(html);
    function getOrError(n) {
        if (n == null)
            throw new Error("Argument is null");
        return n;
    }
    try {
        let $rows = $html.find("tr").has("td.u-c");
        let units = {};
        $rows.each((i, e) => {
            let $r = $(e);
            let $tds = $r.children("td");
            let n = extractIntPositive($tds.eq(2).find("a").eq(0).attr("href"));
            if (n == null || n.length === 0)
                throw new Error("не смог извлечь subid");
            let _subid = n[0];
            let _empl = numberfyOrError($tds.eq(4).text(), -1);
            let _emplMax = numberfyOrError($tds.eq(5).text(), -1);
            let _salary = numberfyOrError(getOnlyText($tds.eq(6))[0], -1);
            let _salaryCity = numberfyOrError($tds.eq(7).text(), -1);
            let $a = $tds.eq(8).find("a").eq(0);
            let _qual = numberfyOrError($a.text(), -1);
            let _qualRequired = numberfyOrError($tds.eq(9).text(), -1);
            let $tdEff = $tds.eq(10);
            let _holiday = $tdEff.find("div.in-holiday").length > 0;
            let _eff = -1;
            if (!_holiday)
                _eff = numberfyOrError($tdEff.text(), -1);
            units[_subid] = {
                subid: _subid,
                empl: _empl,
                emplMax: _emplMax,
                salary: _salary,
                salaryCity: _salaryCity,
                qual: _qual,
                qualRequired: _qualRequired,
                eff: _eff,
                holiday: _holiday
            };
        });
        return units;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Парсит страницу отчета по рекламе, собирает всю инфу по всем юнитам где реклама есть. Где рекламы нет
 * те не выводятся в этой таблице их надо ручками парсить
 * @param html
 * @param url
 */
function parseReportAdvertising(html, url) {
    let $html = $(html);
    try {
        // заберем таблицы по сервисам и по торговле, а рекламу офисов не будем брать. числануть тока по шапкам
        let $tbls = $html.find("table.grid").has("th:contains('Город')");
        let $rows = $tbls.find("tr").has("a[href*='unit']"); // отсекаем шапку оставляем тока чистые
        let units = {};
        $rows.each((i, e) => {
            let $r = $(e);
            let $tds = $r.children("td");
            let n = extractIntPositive($tds.eq(1).find("a").eq(0).attr("href"));
            if (n == null || n.length === 0)
                throw new Error("не смог извлечь subid");
            let _subid = n[0];
            let _budget = numberfyOrError($tds.eq(2).text(), 0);
            let init = $tds.length > 8 ? 4 : 3;
            let _effAd = numberfyOrError($tds.eq(init).text(), -1);
            let _effUnit = numberfyOrError($tds.eq(init + 1).text(), -1);
            let _celebrity = numberfyOrError($tds.eq(init + 2).text().split("(")[0], -1);
            let _visitors = numberfyOrError($tds.eq(init + 3).text().split("(")[0], -1);
            let _profit = numberfy($tds.eq(init + 4).text());
            units[_subid] = {
                subid: _subid,
                budget: _budget,
                celebrity: _celebrity,
                visitors: _visitors,
                effAd: _effAd,
                effUnit: _effUnit,
                profit: _profit
            };
        });
        return units;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Со страницы со всеми продуктами игры парсит их список
 * /lien/main/common/main_page/game_info/products
 * Брендовые товары здесь НЕ отображены и парсены НЕ БУДУТ
 * @param html
 * @param url
 */
function parseProducts(html, url) {
    let $html = $(html);
    try {
        let $items = $html.find("table.list").find("a").has("img");
        if ($items.length === 0)
            throw new Error("не смогли найти ни одного продукта на " + url);
        let dict = {};
        $items.each((i, el) => {
            let $a = $(el);
            let _img = $a.find("img").eq(0).attr("src");
            // название продукта Спортивное питание, Маточное молочко и так далее
            let _name = $a.attr("title").trim();
            if (_name.length === 0)
                throw new Error("Имя продукта пустое.");
            // номер продукта
            let m = matchedOrError($a.attr("href"), /\d+/);
            let _id = numberfyOrError(m, 0); // должно быть больше 0 полюбому
            dict[_img] = { id: _id, name: _name, img: _img };
        });
        return dict;
    }
    catch (err) {
        throw err;
    }
}
/**
 * /olga/main/company/view/6383588/finance_report/by_units/
 * @param html
 * @param url
 */
function parseFinanceRepByUnits(html, url) {
    let $html = $(html);
    try {
        let $grid = $html.find("table.grid");
        if ($grid.length === 0)
            throw new Error("Не найдена таблица с юнитами.");
        let $rows = closestByTagName($grid.find("img[src*='unit_types']"), "tr");
        let res = {};
        $rows.each((i, el) => {
            let $r = $(el);
            let unithref = $r.find("a").attr("href");
            let n = extractIntPositive(unithref);
            if (n == null)
                throw new Error("не смог определить subid для " + unithref);
            let subid = n[0];
            let incomInd = $grid.find("th:contains('Доходы')").index();
            let expInd = $grid.find("th:contains('Расходы')").index();
            let profitInd = $grid.find("th:contains('Прибыль')").index();
            let taxInd = $grid.find("th:contains('Налоги')").index();
            if (incomInd < 0 || expInd < 0 || profitInd < 0 || taxInd < 0)
                throw new Error("не нашли колонки с прибыль, убыток, налоги");
            let income = numberfy($r.children("td").eq(incomInd).text());
            let exp = numberfy($r.children("td").eq(expInd).text());
            let profit = numberfy($r.children("td").eq(profitInd).text());
            let tax = numberfyOrError($r.children("td").eq(taxInd).text(), -1); // налоги всегда плюсовыве
            res[subid] = {
                expense: exp,
                income: income,
                profit: profit,
                tax: tax
            };
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
/**
 * история цен в рознице /lien/window/unit/view/4038828/product_history/15742/
 * элементы в массиве расположены так же как в таблице. самый новый в 0 ячейке, самый старый в последней.
   строка с 0 продажами последняя в рознице вырезается, а в заправках ее нет вообще
 * @param html
 * @param url
 */
function parseRetailPriceHistory(html, url) {
    let $html = $(html);
    try {
        // если продаж на неделе не было вообще => игра не запоминает в историю продаж такие дни вообще.
        // такие дни просто вылетают из списка.
        // сегодняшний день ВСЕГДА есть в списке. КРОМЕ ЗАПРАВОК
        // если продаж сегодня не было, то в строке будут тока бренд 0 а остальное пусто.
        // если сегодня продажи были, то там будут числа и данная строка запомнится как история продаж.
        // причина по которой продаж не было пофиг. Не было товара, цена стояла 0 или стояла очень большая. Похер!
        // так же бывает что последний день задваивается. надо убирать дубли если они есть
        // поэтому кладем в словарь по дате. Потом перегоняем в массив сортируя по дате по убыванию. самая новая первая
        // продажи с 0, вырезаем нахуй чтобы и маги и заправки были идентичны. 
        // отсутствие продаж будем брать со страницы трейдхолла
        let $rows = $html.find("table.list").find("tr.even, tr.odd");
        let dict = {};
        $rows.each((i, el) => {
            let $td = $(el).children();
            let _date = extractDate($td.eq(0).text());
            if (!_date)
                throw new Error("не смог отпарсить дату " + $td.eq(0).text());
            // если количества нет, значит продаж не было строка тупо пустая
            // удаляем ее нахуй
            let _quant = numberfy($td.eq(1).text());
            if (_quant <= 0)
                return;
            let _qual = numberfyOrError($td.eq(2).text(), 0);
            let _price = numberfyOrError($td.eq(3).text(), 0);
            let _brand = numberfyOrError($td.eq(4).text(), -1); // бренд может быть и 0
            dict[dateToShort(_date)] = {
                date: _date,
                quantity: _quant,
                quality: _qual,
                price: _price,
                brand: _brand
            };
        });
        // переводим в массив и сортируем по дате. в 0, самое последнее
        let res = [];
        for (let key in dict)
            res.push(dict[key]);
        let sorted = res.sort((a, b) => {
            if (a.date > b.date)
                return -1;
            if (a.date < b.date)
                return 1;
            return 0;
        });
        return sorted;
    }
    catch (err) {
        throw err;
    }
}
// TODO: запилить парсинг имени юнита везде где он используется
/**
 * Парсит страничку со снабжением магазинов, складов и так далее.
   /lien/window/unit/supply/create/4038828/step2
 * @param html
 * @param url
 */
function parseSupplyCreate(html, url) {
    let $html = $(html);
    try {
        let $rows = $html.find("table.unit-list-2014 tr[id^='r']");
        let res = [];
        $rows.each((i, el) => {
            let $r = $(el);
            let $tds = $r.children("td");
            let isIndependent = $tds.eq(1).text().toLowerCase().indexOf("независимый поставщик") >= 0;
            // ТМ товары идет отдельным списком и их надо выделять
            let tmImg = $tds.eq(0).find("img").attr("src") || "";
            // для независимого поставщика номера юнита нет и нет имени компании
            let subid = 0;
            let companyName = "Независимый поставщик";
            let unitName = "Независимый поставщик";
            if (!isIndependent) {
                let str = $tds.eq(1).find("a").attr("href");
                let nums = extractIntPositive(str);
                if (nums == null || nums.length < 1)
                    throw new Error("невозможно subid для " + $tds.eq(1).text());
                subid = nums[0];
                // есть такие мудаки которые не имеют имени компании вообще. это швиздец. ставим им некое штатное
                // pidoras имя и дальше они с ним внутри игры будут. сразу они в ЧС рукой добавлены чтобы у них ничо не бралось
                companyName = $tds.eq(1).find("b").text();
                if (companyName.length <= 0) {
                    logDebug(`имя компании поставщика юнит ${subid} не спарсилось. присваиваю имя pidoras`);
                    companyName = "pidoras";
                }
                unitName = oneOrError($tds.eq(1), "a").text();
                if (unitName.length <= 0)
                    throw new Error(`имя подразделения компании ${companyName} юнит ${subid} не спарсилось`);
            }
            // если поставщик независимый и его субайди не нашли, значит на складах дохера иначе парсим
            let available = isIndependent ? Number.MAX_SAFE_INTEGER : 0;
            let total = isIndependent ? Number.MAX_SAFE_INTEGER : 0;
            let maxLimit = 0;
            if (!isIndependent) {
                let nums = extractIntPositive($tds.eq(3).html());
                if (nums == null || nums.length < 2)
                    throw new Error("невозможно получить количество на складе и свободное для покупки для " + $tds.eq(1).text());
                available = nums[0];
                total = nums[1];
                // на окне снабжения мы точно не видим сколько же реальный лимит если товара меньше чем лимит
                // реальный лимит мы увидим тока в магазине когда подцепим поставщика
                if ($tds.eq(3).find("u").length > 0)
                    maxLimit = available;
            }
            // свой юнит или открытый для меня, он всегда выводится даже если available 0. Другие включая корп не выводятся если 0
            // поэтому если юнит видим и доступно 0, значит он self
            let offer = numberfyOrError($r.prop("id").substr(1));
            let self = $r.hasClass("myself") || available <= 0;
            // цены ВСЕГДА ЕСТЬ. Даже если на складе пусто
            // это связано с тем что если склад открыт для покупки у него цена больше 0 должна стоять
            let nums = extractFloatPositive($tds.eq(5).html());
            if (nums == null || nums.length < 1)
                throw new Error("невозможно получить цену.");
            let price = nums[0];
            // кача и бренда может не быть если объем на складе у нас 0, иначе быть обязан для розницы
            // для НЕ розницы бренда не будет, поэтому последнее может быть -1 или 0 как повезет
            let quality = numberfy($tds.eq(6).text());
            quality = quality < 0 ? 0 : quality;
            if (available > 0 && quality < 1)
                throw new Error(`качество поставщика ${offer} не найдено`);
            let brand = numberfy($tds.eq(7).text()); // не может быть меньше 1 по факту
            brand = brand < 0 ? 0 : brand;
            let productProp = {
                price: price,
                quality: quality,
                brand: brand
            };
            let supp = {
                id: offer,
                companyName: companyName,
                self: self,
                isIndependend: isIndependent,
                unit: { subid: subid, type: UnitTypes.unknown, name: unitName, size: 0, city: "" },
                maxLimit: maxLimit > 0 ? maxLimit : null,
                stock: {
                    available: available,
                    total: total,
                    purchased: 0,
                    product: productProp
                },
                tmImg: tmImg
            };
            res.push(supp);
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
var MarketIndex;
(function (MarketIndex) {
    MarketIndex[MarketIndex["None"] = -1] = "None";
    MarketIndex[MarketIndex["E"] = 0] = "E";
    MarketIndex[MarketIndex["D"] = 1] = "D";
    MarketIndex[MarketIndex["C"] = 2] = "C";
    MarketIndex[MarketIndex["B"] = 3] = "B";
    MarketIndex[MarketIndex["A"] = 4] = "A";
    MarketIndex[MarketIndex["AA"] = 5] = "AA";
    MarketIndex[MarketIndex["AAA"] = 6] = "AAA";
})(MarketIndex || (MarketIndex = {}));
function mIndexFromString(str) {
    let index = MarketIndex.None;
    switch (str) {
        case "AAA":
            return MarketIndex.AAA;
        case "AA":
            return MarketIndex.AA;
        case "A":
            return MarketIndex.A;
        case "B":
            return MarketIndex.B;
        case "C":
            return MarketIndex.C;
        case "D":
            return MarketIndex.D;
        case "E":
            return MarketIndex.E;
        case "?":
        case "None":
            return MarketIndex.None;
        default:
            throw new Error(`Неизвестный индекс рынка: ${str}`);
    }
}
function parseCityRetailReport(html, url) {
    let $html = $(html);
    try {
        // какой то косяк верстки страниц и страница приходит кривая без второй таблицы, поэтому 
        // строку с индексом находим по слову Индекс
        let $r = oneOrError($html, "tr:contains('Индекс')");
        let $tds = $r.children("td");
        // продукт, индекс, объем рынка, число продавцов и компаний
        let $img = oneOrError($tds.eq(0), "img");
        let img = $img.attr("src");
        let name = $img.attr("alt");
        let nums = extractIntPositive(url);
        if (nums == null)
            throw new Error("Не получилось извлечь id товара из " + url);
        let id = nums[0];
        let indexStr = $tds.eq(2).text().trim();
        let index = mIndexFromString(indexStr);
        let quant = numberfyOrError($tds.eq(4).text(), -1);
        let sellersCnt = numberfyOrError($tds.eq(6).text(), -1);
        let companiesCnt = numberfyOrError($tds.eq(8).text(), -1);
        let $priceTbl = oneOrError($html, "table.grid");
        // местные
        let localPrice = numberfyOrError($priceTbl.find("tr").eq(1).children("td").eq(0).text());
        let localQual = numberfyOrError($priceTbl.find("tr").eq(2).children("td").eq(0).text());
        let localBrand = numberfy($priceTbl.find("tr").eq(3).children("td").eq(0).text()); // может быть равен -
        // магазины
        let shopPrice = numberfyOrError($priceTbl.find("tr").eq(1).children("td").eq(1).text());
        let shopQual = numberfyOrError($priceTbl.find("tr").eq(2).children("td").eq(1).text());
        let shopBrand = numberfy($priceTbl.find("tr").eq(3).children("td").eq(1).text()); // может быть равен -
        return {
            product: { id: id, img: img, name: name },
            index: index,
            size: quant,
            sellerCount: sellersCnt,
            companyCount: companiesCnt,
            locals: { price: localPrice, quality: localQual, brand: Math.max(localBrand, 0) },
            shops: { price: shopPrice, quality: shopQual, brand: Math.max(shopBrand, 0) },
        };
    }
    catch (err) {
        throw err;
    }
}
/**
 * Размеры товаров. Задает сколько метров склада надо на 1 штуку товара
   /lien/main/industry/unit_type/info/2011/volume
   
 * @param html
 * @param url
 */
function parseProductsSize(html, url) {
    let $html = $(html);
    try {
        let $rows = closestByTagName($html.find("table.grid img"), "tr");
        if ($rows.length < 100)
            throw new Error('слишком мало товаров найдено. очевидно ошибка');
        let res = {};
        $rows.each((i, el) => {
            let $r = $(el);
            let $img = oneOrError($r, "img");
            let img = $img.attr("src");
            let name = $img.attr("title");
            let n = extractIntPositive($r.find("a").eq(0).attr("href"));
            if (n == null || n.length > 1)
                throw new Error("не найден id продукта " + img);
            let id = n[0];
            // сколько штук влазит в 5млн метров склада
            let quant = numberfyOrError($r.find("td").last().text());
            // на выходе дадим сколько метров надо на 1 штуку товара
            res[id] = [{ id: id, img: img, name: name }, 5000000 / quant];
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Таможенные пошлины и индикативные цены img = duties
 * @param html
 * @param url
 */
function parseCountryDuties(html, url) {
    let $html = $(html);
    try {
        let $tbl = oneOrError($html, "table.list");
        let $img = $tbl.find("td:nth-child(5n-4)");
        let $exp = $tbl.find("td:nth-child(5n-2)");
        let $imp = $tbl.find("td:nth-child(5n-1)");
        let $ip = $tbl.find("td:nth-child(5n)");
        if ($img.length !== $ip.length)
            throw new Error("картинок товара и индикативных цен найдено разное число");
        // в таблице есть пробелы, поэтому если картинки нет значит это пробел
        let dict = {};
        for (let i = 0; i < $ip.length; i++) {
            let img = $img.eq(i).find("img").attr("src");
            if (img == null || img.length <= 0)
                continue;
            dict[img] = {
                export: numberfyOrError($exp.eq(i).text(), -1),
                import: numberfyOrError($imp.eq(i).text(), -1),
                ip: numberfyOrError($ip.eq(i).text())
            };
        }
        return dict;
    }
    catch (err) {
        throw err;
    }
}
/**
 * /olga/main/globalreport/tm/info
 * @param html
 * @param url
 */
function parseTM(html, url) {
    let $html = $(html);
    try {
        let $imgs = $html.find("table.grid").find("img");
        let dict = {};
        $imgs.each((i, el) => {
            let $img = $(el);
            let img = $img.attr("src");
            let lines = getOnlyText($img.closest("td").next("td"));
            if (lines.length !== 4)
                throw new Error("ошибка извлечения имени товара франшизы для " + img);
            dict[img] = lines[1].trim();
        });
        return dict;
    }
    catch (err) {
        throw err;
    }
}
/**
 * Парсер отчета по производственным специализациям со страницы аналитических отчетов
   /olga/main/mediareport
 * @param html
 * @param url
 */
function parseReportSpec(html, url) {
    let $html = $(html);
    try {
        let $table = oneOrError($html, "table.list");
        let $rows = $table.find("img").closest(".even, .odd"); // в каждой строке картинка товара, но картинки есть и в других местах
        if ($rows.length < 5)
            throw new Error(`найдено слишком мало(${$rows.length}) специализаций в отчете ${url}`);
        let res = [];
        $rows.each((i, el) => {
            let $r = $(el);
            let $tds = $r.children("td");
            // спецуха
            let $a = oneOrError($tds.eq(0), "a");
            let spec = $a.text();
            let n = extractIntPositive($a.attr("href"));
            if (n == null || n.length != 1)
                throw new Error("не нашли id завода " + spec);
            let fid = n[0]; // id завода. есть товары которые на разных заводах можно делать а спецуха одинакова
            // товар
            let $img = oneOrError($tds.eq(1), "img");
            let img = $img.attr("src");
            let name = $img.attr("alt");
            $a = $img.closest("a");
            n = extractIntPositive($a.attr("href"));
            if (n == null || n.length != 1)
                throw new Error("не нашли id товара " + img);
            let id = n[0];
            // производство 
            let units = numberfyOrError($tds.eq(2).text(), -1);
            let quant = numberfyOrError(getInnerText($tds.get(3)), -1);
            res.push({
                product: { id: id, img: img, name: name },
                specialization: spec,
                factoryID: fid,
                quantity: quant,
                unitCount: units
            });
        });
        return res;
    }
    catch (err) {
        throw err;
    }
}
function parseX(html, url) {
    //let $html = $(html);
    //try {
    //    let _size = $html.find(".nowrap:nth-child(2)").map((i, e) => {
    //        let txt = $(e).text();
    //        let sz = numberfyOrError(txt);
    //        if (txt.indexOf("тыс") >= 0)
    //            sz *= 1000;
    //        if (txt.indexOf("млн") >= 0)
    //            sz *= 1000000;
    //        return sz;
    //    }).get() as any as number[];
    //    let _rent = $html.find(".nowrap:nth-child(3)").map((i, e) => numberfyOrError($(e).text())).get() as any as number[];
    //    let _id = $html.find(":radio").map((i, e) => numberfyOrError($(e).val())).get() as any as number[];
    //    return {
    //        size: _size,
    //        rent: _rent,
    //        id: _id
    //    };
    //}
    //catch (err) {
    //    throw new ParseError("ware size", url, err);
    //}
}
//
// Свои исключения
// 
class ArgumentError extends Error {
    constructor(argument, message) {
        let msg = `${argument}. ${message}`;
        super(msg);
    }
}
class ArgumentNullError extends Error {
    constructor(argument) {
        let msg = `${argument} is null`;
        super(msg);
    }
}
class ParseError extends Error {
    constructor(dataName, url, innerError) {
        let msg = `Error parsing ${dataName}`;
        if (url)
            msg += `from ${url}`;
        // TODO: как то плохо работает. не выводит нихрена сообщений.
        msg += ".";
        if (innerError)
            msg += "\n" + innerError.message + ".";
        super(msg);
    }
}
;
/// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
/// <reference path= "../../XioPorted/PageParsers/7_PageParserFunctions.ts" />
/// <reference path= "../../XioPorted/PageParsers/1_Exceptions.ts" />
/// <reference path= "../../XioPorted/PageParsers/2_IDictionary.ts" />
$ = jQuery = jQuery.noConflict(true);
$xioDebug = true;
let Realm = getRealmOrError();
let CompanyId = getCompanyId();
// упрощаем себе жисть, подставляем имя скрипта всегда в сообщении
function log(msg, ...args) {
    msg = "duties: " + msg;
    logDebug(msg, ...args);
}
function run_async() {
    return __awaiter(this, void 0, void 0, function* () {
        let $header = oneOrError($(document), "div.metro_header_content");
        let $div = $("<div></div>");
        let $updateBtn = $("<input id='update' type='button' value='обновить'>");
        $div.append($updateBtn);
        $updateBtn.on("click.duties", function (event) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    $updateBtn.prop("disabled", true);
                    yield exportInfo_async($div);
                }
                catch (err) {
                    let msg = err.message;
                    $div.append(`<span>${msg}</span>`);
                }
                finally {
                    $updateBtn.prop("disabled", false);
                }
            });
        });
        $header.after($div);
    });
}
function exportInfo_async($place) {
    return __awaiter(this, void 0, void 0, function* () {
        if ($place.length <= 0)
            return false;
        if ($place.find("#txtExport").length > 0) {
            $place.find("#txtExport").remove();
            return false;
        }
        let $txt = $('<textarea id="txtExport" style="display:block;width: 800px; height: 200px"></textarea>');
        let storedInfo = yield getDuties_async();
        let exportStr = "country;region;city;img;ip;export;import" + "\n";
        // по всем городам и товарам пролетаем
        for (let [country, reg, city, dDict] of storedInfo) {
            for (let img in dDict) {
                let duties = dDict[img];
                let str = formatStr("{0};{1};{2};{3};{4};{5};{6}", country.name, reg.name, city.name, img, duties.ip, duties.export, duties.import);
                exportStr += str + "\n";
            }
        }
        $txt.text(exportStr);
        $place.append($txt);
        return true;
    });
}
/**
 * собирает всю информацию по странам регионам вклюая связующую таблицу между городами странами и регионами
 */
function getGeos_async() {
    return __awaiter(this, void 0, void 0, function* () {
        let countries_tpl = `/${Realm}/main/common/main_page/game_info/bonuses/country`;
        let regions_tpl = `/${Realm}/main/common/main_page/game_info/bonuses/region`;
        let cities_tpl = `/${Realm}/main/common/main_page/game_info/bonuses/city`;
        try {
            // сначала собираем данные по городам регионам отдельно
            let cntryhtml = yield tryGet_async(countries_tpl);
            let countries = parseCountries(cntryhtml, countries_tpl);
            yield tryGet_async(`/${Realm}/main/common/util/setpaging/report/regionBonus/20000`);
            let rhtml = yield tryGet_async(regions_tpl);
            let regions = parseRegions(rhtml, regions_tpl);
            yield tryGet_async(`/${Realm}/main/common/util/setpaging/report/cityBonus/20000`);
            let chtml = yield tryGet_async(cities_tpl);
            let cities = parseCities(chtml, cities_tpl);
            // так как собранных данных недостаточно чтобы сделать связку, соберем доп данные для формирования связки
            // город = страна,регион
            // единственный простой способ это спарсить со страницы торговли селекты
            let html = yield tryGet_async(`/${Realm}/main/globalreport/marketing/by_trade_at_cities`);
            let $html = $(html);
            let $options = $html.find("select").eq(3).children("option.geocombo");
            let dict = {};
            $options.each((i, el) => {
                let $opt = $(el);
                let cityName = $opt.text().trim();
                if (cityName.length < 1)
                    throw new Error("имя города не найдено");
                let items = $opt.val().split("/"); // /422607/422609/422626
                if (items.length != 4)
                    throw new Error("ошибка сбора связки по городам регионам");
                let countryID = numberfyOrError(items[1]);
                let regID = numberfyOrError(items[2]);
                let cityID = numberfyOrError(items[3]);
                let country = countries.find(v => v.id === countryID);
                let region = regions.find(v => v.id === regID);
                let city = cities.find(v => v.id === cityID);
                if (country == null || region == null || city == null)
                    throw new Error("ошибка связывания городов и стран для города " + cityName);
                if (dict[cityName] != null)
                    throw new Error(`город ${cityName} повторяется 2 раза`);
                dict[cityName] = [country, region, city];
            });
            return dict;
        }
        catch (err) {
            throw err;
        }
    });
}
/**
 * Возвращает Массив: Страна,Регион,Город, Словарь<Таможенные пошлины>
 */
function getDuties_async() {
    return __awaiter(this, void 0, void 0, function* () {
        // запросим сначала таблицу город-страна-регион чтобы иметь связку для поиска
        let geos = yield getGeos_async();
        // для каждого города берем его страну тащим таможню и сохраняем в спец словарь чтобы не повторяться
        let countryDict = {};
        let resDict = [];
        for (let city in geos) {
            let [cntry, reg, cty] = geos[city];
            if (countryDict[cntry.id] != null) {
                resDict.push(countryDict[cntry.id]);
                continue;
            }
            let url = `/${Realm}/main/geo/countrydutylist/${cntry.id}`;
            let html = yield tryGet_async(url);
            let dDict = parseCountryDuties(html, url);
            countryDict[cntry.id] = [cntry, reg, cty, dDict];
            resDict.push([cntry, reg, cty, dDict]);
        }
        return resDict;
    });
}
$(document).ready(() => run_async());
