
/// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
/// <reference path= "../../XioPorted/PageParsers/7_PageParserFunctions.ts" />
/// <reference path= "../../XioPorted/PageParsers/1_Exceptions.ts" />
/// <reference path= "../../XioPorted/PageParsers/2_IDictionary.ts" />

$ = jQuery = jQuery.noConflict(true);
$xioDebug = true;
let Realm = getRealmOrError();
let CompanyId = getCompanyId();

// упрощаем себе жисть, подставляем имя скрипта всегда в сообщении
function log(msg: string, ...args: any[]) {

    msg = "duties: " + msg;
    logDebug(msg, ...args);
}


async function run_async() {

    let $header = oneOrError($(document), "div.metro_header_content");

    let $div = $("<div></div>");
    let $updateBtn = $("<input id='update' type='button' value='обновить'>");
    $div.append($updateBtn);

    $updateBtn.on("click.duties", async function (event) {
        try {
            $updateBtn.prop("disabled", true);
            await exportInfo_async($div);
        }
        catch (err) {
            let msg = (err as Error).message;
            $div.append(`<span>${msg}</span>`);
        }
        finally{
            $updateBtn.prop("disabled", false);
        }
    });

    $header.after($div);
}

async function exportInfo_async($place: JQuery) {
    if ($place.length <= 0)
        return false;

    if ($place.find("#txtExport").length > 0) {
        $place.find("#txtExport").remove();
        return false;
    }

    let $txt = $('<textarea id="txtExport" style="display:block;width: 800px; height: 200px"></textarea>');

    let storedInfo = await getDuties_async();

    let exportStr = "city;img;ip;export;import" + "\n";

    // по всем городам и товарам пролетаем
    for (let city in storedInfo) {
        let dDict = storedInfo[city];

        for (let img in dDict) {
            let duties = dDict[img];

            let str = formatStr("{0};{1};{2};{3};{4}", city, img, duties.ip, duties.export, duties.import);
            exportStr += str + "\n";
        }
    }


    $txt.text(exportStr);
    $place.append($txt);
    return true;
}

/**
 * собирает всю информацию по странам регионам вклюая связующую таблицу между городами странами и регионами
 */
async function getGeos_async(): Promise<IDictionary<[ICountry, IRegion, ICity]>> {

    let countries_tpl = `/${Realm}/main/common/main_page/game_info/bonuses/country`;
    let regions_tpl = `/${Realm}/main/common/main_page/game_info/bonuses/region`;
    let cities_tpl = `/${Realm}/main/common/main_page/game_info/bonuses/city`;

    try {
        // сначала собираем данные по городам регионам отдельно
        let cntryhtml = await tryGet_async(countries_tpl);
        let countries = parseCountries(cntryhtml, countries_tpl);

        await tryGet_async(`/${Realm}/main/common/util/setpaging/report/regionBonus/20000`);
        let rhtml = await tryGet_async(regions_tpl);
        let regions = parseRegions(rhtml, regions_tpl);

        await tryGet_async(`/${Realm}/main/common/util/setpaging/report/cityBonus/20000`);
        let chtml = await tryGet_async(cities_tpl);
        let cities = parseCities(chtml, cities_tpl);

        // так как собранных данных недостаточно чтобы сделать связку, соберем доп данные для формирования связки
        // город = страна,регион
        // единственный простой способ это спарсить со страницы торговли селекты
        let html = await tryGet_async(`/${Realm}/main/globalreport/marketing/by_trade_at_cities`);
        let $html = $(html);
        let $options = $html.find("select").eq(3).children("option.geocombo");

        let dict: IDictionary<[ICountry, IRegion, ICity]> = {};
        $options.each((i, el) => {
            let $opt = $(el);

            let cityName = $opt.text().trim();
            if (cityName.length < 1)
                throw new Error("имя города не найдено");

            let items = ($opt.val() as string).split("/");  // /422607/422609/422626
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
}

/**
 * Возвращает словарь Город - Словарь<Таможенные пошлины>
 */
async function getDuties_async(): Promise<IDictionary<IDictionary<ICountryDuties>>> {

    // запросим сначала таблицу город-страна-регион чтобы иметь связку для поиска
    let geos = await getGeos_async();

    // для каждого города берем его страну тащим таможню и сохраняем в спец словарь чтобы не повторяться
    let countryDict: IDictionaryN<IDictionary<ICountryDuties>> = {};
    let resDict: IDictionary<IDictionary<ICountryDuties>> = {};
    for (let city in geos) {
        let [country, ,] = geos[city];
        if (countryDict[country.id] != null) {
            resDict[city] = countryDict[country.id];
            continue;
        }

        let url = `/${Realm}/main/geo/countrydutylist/${country.id}`;
        let html = await tryGet_async(url);
        let dDict = parseCountryDuties(html, url);

        countryDict[country.id] = dDict;
        resDict[city] = dDict;
    }

    return resDict;
}


function nullCheck<T>(val: T | null) {

    if (val == null)
        throw new Error(`nullCheck Error`);

    return val;
}

$(document).ready(() => run_async());