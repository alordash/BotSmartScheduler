const request = require('request-promise');

exports.speachToText = class {
	constructor(API_KEY, FOLDER_ID) {
		this.API_KEY = API_KEY;
		this.FOLDER_ID = FOLDER_ID;
		this.url = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?folderId=';
	}

	async recognize(body) {
		try {
			const response = await request.post({
				url: this.url + this.FOLDER_ID,
				headers: {
					'Authorization': `Api-Key ` + this.API_KEY,
				},
				body
			});
			return JSON.parse(response).result;
		} catch (e) {
			console.error(e);
		}
	}
}