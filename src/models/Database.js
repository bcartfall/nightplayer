/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, getDoc, setDoc, doc, query, orderBy } from "firebase/firestore";
import { openDB } from 'idb';

class Database {
    async setDriver(driver, settings) {
        this._driver = driver;
        this._settings = settings;
        
        if (driver === 'firebase') {
            // init firebase
            // https://firebase.google.com/docs/firestore/quickstart#web-version-9
            const app = initializeApp(settings.firebase);
            this._db = getFirestore(app);
        } else {
            // init indexeddb
            this._db = await openDB('nightplayer', 1, {
                upgrade(db) {
                    // Create a store of objects
                    const store = db.createObjectStore('videos', {
                        keyPath: 'uuid',
                        autoIncrement: false,
                    });
                    // indices
                    store.createIndex('order', 'order');
                },
            });
        }
    }

    isFirebaseConfigured() {
        return this._settings.firebase && this._settings.firebase.apiKey;
    }

    async get(table, key) {
        if (this._driver === 'indexeddb') {

            if (key === '*') {
                // get all
                return await this._db.getAllFromIndex(table, 'order'); // get all from table ordered by 'order' 
            } else {
                // get one
                return await this._db.get(table, key);
            }
        } else if (this._driver === 'firebase') {
            if (!this.isFirebaseConfigured()) {
                throw new Error('Firebase settings are not configured yet.');
            }

            if (key === '*') {
                // get all
                const ref = collection(this._db, table);
                const q = query(ref, orderBy('order'));
                const querySnapshot = await getDocs(q);
                let results = [];
                querySnapshot.forEach((doc) => {
                    results.push(doc.data());
                });
                return results;
            } else {
                // get one
                const ref = collection(this._db, table, key);
                const snapshot = await getDoc(ref);
                return snapshot.data();
            }
        } else {
            throw new Error('Database driver not implmented.');
        }
    }

    async set(table, key, value) {
        if (this._driver === 'indexeddb') {
            await this._db.put(table, value);
            return value;
        } else if (this._driver === 'firebase') {
            if (!this.isFirebaseConfigured()) {
                throw new Error('Firebase settings are not configured yet.');
            }

            try {
                await setDoc(doc(this._db, table, key), value);
            } catch (e) {
                console.error(e);
            }
            return value;
        } else {
            throw new Error('Database driver not implmented.');
        }
    }

    async delete(table, key) {
        if (this._driver === 'indexeddb') {
            await this._db.delete(table, key);
        } else if (this._driver === 'firebase') {
            if (!this.isFirebaseConfigured()) {
                throw new Error('Firebase settings are not configured yet.');
            }

            try {
                await deleteDoc(doc(this._db, table, key));
            } catch (e) {
                console.error(e);
            }
        } else {
            throw new Error('Database driver not implmented.');
        }
    }
};

const db = new Database();
export default db;