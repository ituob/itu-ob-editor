import React, { useState, useEffect } from 'react';

import { AuthFlow, AuthStateEmitter } from './oauth-flow';
import { ChangeCommitter } from './sync';


const authFlow = new AuthFlow();


interface DataSynchronizerProps {}
export const DataSynchronizer: React.FC<DataSynchronizerProps> = function () {
  const [isLoggedIn, setLoggedIn] = useState(authFlow.loggedIn());

  useEffect(() => {
    (async () => {
      if (!isLoggedIn) {
        await authFlow.fetchServiceConfiguration();
        await authFlow.makeAuthorizationRequest();
      }
    })();
  }, [isLoggedIn]);

  authFlow.authStateEmitter.on(AuthStateEmitter.ON_TOKEN_RESPONSE, () => {
    setLoggedIn(true);
  });

  return (
    <>
      {isLoggedIn === false
        ? <p>Logging in…</p>
        : <ChangeCommitter />}
    </>
  );
};
