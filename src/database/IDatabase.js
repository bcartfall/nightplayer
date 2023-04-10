/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

export default class IDatabase {
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