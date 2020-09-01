const DateParser = require('../backend/dateParser/dateParser');

describe('Date Parser', function () {
   it('Сходить на улицу в воскресенье без 59 двадцать утра', async function () {
      let result = await DateParser.ParseDate('Сходить на улицу в воскресенье без 59 двадцать утра', false);
      expect(result.answer).toBe(`"Сходить на улицу": <b>31 мая 07:01</b>`);
   });

   it('Полить цветы в десять часов сорок минут утра тринадцатого ноября две тысячи двадцать второго года', async function () {
      let result = await DateParser.ParseDate('Полить цветы в десять часов сорок минут утра тринадцатого ноября две тысячи двадцать второго года', true);
      expect(result.answer).toBe(`"Полить цветы": <b>13 ноября 10:40 2022 г.</b>`);
   });

   it('6 апреля в 15.00 На Ногти Мне', async function () {
      let result = await DateParser.ParseDate('6 апреля в 15.00 На Ногти Мне', false);
      expect(result.answer).toBe(`"На Ногти Мне": <b>6 апреля 15:00 2021 г.</b>`)
   });

   it('17 апреля в 15.30 к ортодонту', async function () {
      let result = await DateParser.ParseDate('17 апреля в 15.30 к ортодонту', false);
      expect(result.answer).toBe(`"К ортодонту": <b>17 апреля 15:30 2021 г.</b>`);
   });

   it('купить в без двадцати десять вечера тринадцатого декабря две тысячи тридцатого года', async function () {
      let result = await DateParser.ParseDate('купить в без двадцати десять вечера тринадцатого декабря две тысячи тридцатого года', false);
      expect(result.answer).toBe(`"Купить": <b>13 декабря 21:40 2030 г.</b>`);
   });

   it('@viordash  32 декабря в 12 часов утра напомни позвонить в центр эл подписи', async function () {
      let result = await DateParser.ParseDate('@viordash  32 декабря в 12 часов утра напомни позвонить в центр эл подписи', false);
      expect(result.answer).toBe(`"@viordash напомни позвонить в центр эл подписи": <b>1 января 12:00 2021 г.</b>`);
   });

   it("stest", async function () {
      let result = await DateParser.ParseDate("stest", false);
      expect(result.answer).toBe("Can not schedule for this date");
   });
   /*
       it('запустить пк послезавтра тридцатого августа в пять шесть в две тысячи тридцать седьмом году', async function () {
           let result = await DateParser.ParseDate('запустить пк послезавтра тридцатого августа в пять шесть в две тысячи тридцать седьмом году', false);
           expect(result.answer).toBe(`"запустить пк 30 августа в 2037 году" for\r\nSun May 24 2020 05:06:00 GMT+0300 (Москва, стандартное время)`);
       });*/
   /*
       it('завари чай через 10 дней 20 недель 30 часов 100 минут 20 годов', async function () {
           let result = await DateParser.ParseDate('завари чай через 10 дней 20 недель 30 часов 100 минут 2030 годов', false);
           expect(result.answer).toBe(`"завари чай 20" for\r\nSat Jun 02 2040 19:20:00 GMT+0300 (Москва, стандартное время)`)
       });*/
});