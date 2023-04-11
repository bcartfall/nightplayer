/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, getDoc, setDoc, doc, query, orderBy } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

import IDatabase from "./IDatabase";

class Firebase extends IDatabase {
    async init(settings) {
        this._settings = settings;
        
        // init firebase
        // https://firebase.google.com/docs/firestore/quickstart#web-version-9
        if (this._firebaseApp) {
            await deleteApp(this._firebaseApp);
        }
        this._firebaseApp = initializeApp(settings.firebase);
        this._db = getFirestore(this._firebaseApp);

        const auth = getAuth();
        await signInAnonymously(auth);
    }

    isFirebaseConfigured() {
        return this._settings.firebase && this._settings.firebase.apiKey;
    }

    async get(table, key, options = {}) {
        //const where = options.where ?? [];
        const order = options.orderBy ?? ['order', 'asc'];

        // options = {where: [{index, equals}], orderBy: [key,'asc]}
        if (!this.isFirebaseConfigured()) {
            throw new Error('Firebase settings are not configured yet.');
        }

        if (key === '*') {
            // get all
            const ref = collection(this._db, table);
            const q = query(ref, orderBy(order[0]));
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
    }

    async put(table, key, value) {
        if (!this.isFirebaseConfigured()) {
            throw new Error('Firebase settings are not configured yet.');
        }

        try {
            await setDoc(doc(this._db, table, key), value);
        } catch (e) {
            console.error(e);
        }
        return value;
    }

    async delete(table, key) {
        if (!this.isFirebaseConfigured()) {
            throw new Error('Firebase settings are not configured yet.');
        }

        try {
            await deleteDoc(doc(this._db, table, key));
        } catch (e) {
            console.error(e);
        }
    }
};

export default Firebase;