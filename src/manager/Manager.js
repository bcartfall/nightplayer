/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2026-11-17
 * See README.md
 */

import NightplayerManager from "./NightplayerManager";

let manager = null;

export const setManager = async (managerName, settings) => {
    if (managerName === 'nightplayer-manager') {
        manager = new NightplayerManager();
        return await manager.init(settings);
    }
    throw new Error('Manager not implemented.');
};

export const getManager = () => {
    return manager;
};
