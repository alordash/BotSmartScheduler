const { DataBase } = require("./DataBase");


/**
 * @param {String} dbUrl 
 * @returns {{users: Array.<User>, chats: Array.<Chat>, schedules: Array.<Schedules>}}
 */
async function CopyDatabase(dbUrl) {
    if (dbUrl == undefined) {
        return { users: [], chats: [], schedules: [] };
    }
    dbUrl = new URL(dbUrl);
    const dbOptions = {
        user: dbUrl.username,
        host: dbUrl.hostname,
        database: dbUrl.pathname.substring(1),
        password: dbUrl.password,
        port: parseInt(dbUrl.port),
        ssl: {
            rejectUnauthorized: false
        }
    }

    DataBase.EstablishConnection(dbOptions);
    let users = await DataBase.Users.GetAllUsers();
    let chats = await DataBase.Chats.GetAllChats();
    let schedules = await DataBase.Schedules.GetAllSchedules();

    return { users, chats, schedules };
}

/**
 * 
 * @param {Array.<User>} users 
 * @param {Array.<Chat>} chats 
 * @param {Array.<Schedule>} schedules 
 */
async function SaveDatabase(users, chats, schedules) {
    console.log(`Saving ${users.length} users, ${chats.length} chats, ${schedules.length} schedules`);
    await DataBase.Users.InsertUsers(users);
    await DataBase.Chats.InsertChats(chats);
    await DataBase.Schedules.InsertSchedules(schedules);
}

module.exports = {
    CopyDatabase,
    SaveDatabase
}