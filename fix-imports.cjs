const fs = require('fs');
let code = fs.readFileSync('src/context/AppContext.tsx', 'utf-8');

code = code.replace(
  /import React, { createContext, useContext, useState, useEffect } from 'react';/,
  "import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';"
);

fs.writeFileSync('src/context/AppContext.tsx', code);
