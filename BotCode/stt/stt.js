const request = require('request-promise');

exports.speachToText = class {
	constructor(IAM_TOKEN, FOLDER_ID) {
		this.IAM_TOKEN = IAM_TOKEN;
		this.FOLDER_ID = FOLDER_ID;
		this.url = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?folderId=';
	}

	async recognize(body) {
		try {
			const response = await request.post({
				url: this.url + this.FOLDER_ID,
				headers: {
					'Authorization': `Bearer ` + this.IAM_TOKEN,
				},
				body
			});
			return JSON.parse(response).result;
		} catch (e) {
			console.error(e);
		}
	}
}