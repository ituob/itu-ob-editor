import moment from 'moment';
import React, { useContext } from 'react';

import { LangConfigContext } from 'sse/localizer/renderer';
import { usePublication, useRecommendation } from 'storage/renderer';
import { Recommendation, ITURecommendation } from 'models/recommendations';


export const PublicationTitle: React.FC<{ id: string }> = function ({ id }) {
  const lang = useContext(LangConfigContext);
  const pub = usePublication(id);

  if (pub) {
    return <>{pub.title[lang.default]}</>;
  } else {
    return <em>{id}</em>;
  }
};


export const RecommendationTitle: React.FC<{ rec: Recommendation }> = function ({ rec }) {
  const lang = useContext(LangConfigContext);
  const version = rec.version ? `(${moment(rec.version).format('YYYY-MM')})` : null;
  const ituRec: ITURecommendation | undefined = useRecommendation(rec.code);

  if (ituRec) {
    return <>
      {rec.body} Rec. {rec.code} {version} <em>{ituRec.title[lang.default]}</em>
    </>;
  } else {
    return <em>
      {rec.body} {rec.code} {version}
    </em>;
  }
};
