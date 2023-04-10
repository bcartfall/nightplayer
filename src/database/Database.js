/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import Firebase from "./Firebase";
import IndexedDB from "./IndexedDB";

export class IDatabase {
    construct() {
    }

    async init(settings) {
        throw new Error('Not implemented.');
    }

    async get(table, key, options = {}) {
        // options = {where: [{index, equals}], orderBy: [key,'asc]}
        throw new Error('Not implemented.');
    }

    async put(table, key, value) {
        throw new Error('Not implemented.');
    }

    async delete(table, key) {
        throw new Error('Not implemented.');
    }
};

let db = null;

export const setDatabase = async (driver, settings) => {
    if (driver === 'firebase') {
        db = new Firebase();
        return await db.init(settings);
    } else if (driver === 'indexeddb') {
        db = new IndexedDB();
        return await db.init(settings);
    }
    throw new Error('Driver not implemented.');
};

export const getDatabase = () => {
    return db;
};
