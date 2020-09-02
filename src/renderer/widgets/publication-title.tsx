import moment from 'moment';
import React, { useContext } from 'react';

import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';
import { app } from 'renderer/index';
import { Publication } from 'models/publications';
import { Recommendation, ITURecommendation } from 'models/recommendations';


export const PublicationTitle: React.FC<{ id: string }> = function ({ id }) {
  const lang = useContext(LangConfigContext);
  const pub = app.useOne<Publication, string>('publications', id).object;

  if (pub) {
    return <>{pub.title[lang.default]}</>;
  } else {
    return <em>{id}</em>;
  }
};


export const RecommendationTitle: React.FC<{ rec: Recommendation }> = function ({ rec }) {
  const lang = useContext(LangConfigContext);
  const version = rec.version ? `(${moment(rec.version).format('YYYY-MM')})` : null;
  const ituRec: ITURecommendation | null = app.useOne<ITURecommendation, string>('recommendations', rec.code).object;

  if (ituRec !== null) {
    return <>
      {rec.body} Rec. {rec.code} {version} <em>{ituRec.title[lang.default]}</em>
    </>;
  } else {
    return <em>
      {rec.body} {rec.code} {version}
    </em>;
  }
};
