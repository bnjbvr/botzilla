-- Up
CREATE TABLE ModuleSetting (
    id           INTEGER     PRIMARY KEY,
    matrixRoomId TEXT        NOT NULL,
    moduleName   TEXT        NOT NULL,
    enabled      BOOLEAN     NOT NULL,
    options      TEXT
);

INSERT INTO ModuleSetting (matrixRoomId, moduleName, enabled) VALUES ('*', 'help', true);

-- Down
DROP TABLE ModuleSetting;
