/**
 * Developed by Hutz Media Ltd. <info@hutzmedia.com>
 * Copyright 2023-04-02
 * See README.md
 */

import { createContext } from 'react';

export default createContext({
    videos: [],
    addVideoUrl: (props, callback) => {},
    saveVideo: (video) => {},
    changeVideoOrder: (changeVideo, fromIndex, toIndex) => {},
    removeVideo: (video) => {},
    restoreVideo: (video) => {},
    loading: false,
    updateLastAction: () => {},
    autoplayRef: {current: false},
    addFolder: (parentId, name) => {},
});