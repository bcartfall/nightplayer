/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, getDoc, setDoc, doc, query, orderBy, where, writeBatch, } from "firebase/firestore";
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
        const whereOption = options.where ?? [];
        const order = options.orderBy ?? [['order', 'asc']];

        // options = {where: [{index, equals}], orderBy: [key,'asc]}
        if (!this.isFirebaseConfigured()) {
            throw new Error('Firebase settings are not configured yet.');
        }

        let results = [];
        if (key === '*') {
            const ref = collection(this._db, table);
            if (whereOption.length > 0) {
                const q = query(ref, where(whereOption[0][0], '==', whereOption[0][2]), orderBy(order[0][0]));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    results.push(doc.data());
                });
            } else {
                // get all
                const q = query(ref, orderBy(order[0][0]));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    results.push(doc.data());
                });
            }
            if (order[0][1] === 'desc') {
                results.reverse();
            }
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

    async delete(table, key, options = {}) {
        if (!this.isFirebaseConfigured()) {
            throw new Error('Firebase settings are not configured yet.');
        }
        const whereOption = options.where ?? [];

        try {
            if (whereOption.length > 0) {
                // firebase can't use where while deleting so fetch all of the data using a where command and then
                // use a batch to delete all in one request
                const ref = collection(this._db, table);
                const batch = writeBatch(this._db);
                const q = query(ref, where(whereOption[0][0], '==', whereOption[0][2]));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
            } else {
                await deleteDoc(doc(this._db, table, key));
            }
        } catch (e) {
            console.error(e);
        }
    }
};

export default Firebase;