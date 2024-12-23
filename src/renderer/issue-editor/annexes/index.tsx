import update from "immutability-helper";
import { shell } from "@electron/remote";

import React, { useState, useContext } from "react";

import {
  Button,
  FormGroup,
  Text,
  NonIdealState,
  Callout,
} from "@blueprintjs/core/lib/esm";
import { DatePicker } from "@blueprintjs/datetime/lib/esm";

import { PaneHeader } from "@riboseinc/coulomb/renderer/widgets";
import { LangConfigContext } from "@riboseinc/coulomb/localizer/renderer/context";
import { callIPC } from "@riboseinc/coulomb/ipc/renderer";

import { app } from "renderer/index";
import { useLatestAnnex } from "renderer/hooks";
import { DateStamp } from "renderer/widgets/dates";
import {
  RecommendationTitle,
  PublicationTitle,
} from "renderer/widgets/publication-title";
import { HelpButton } from "renderer/widgets/help-button";
import { Publication } from "models/publications";
import { AnnexedPosition, PositionDatasets } from "models/issues";
import { AnnexedPositionDataEditor } from "./position-data";

import * as sharedStyles from "../styles.scss";
import * as styles from "./styles.scss";
import { Dataset } from "models/dataset";

interface AnnexEditorProps {
  pubId: string;
  issueId: number;
  position: AnnexedPosition | null;
  onChange?: (pubId: string, position: AnnexedPosition | null) => void;
}
export const AnnexEditor: React.FC<AnnexEditorProps> = function ({
  pubId,
  position,
  onChange,
  issueId,
}) {
  const [editingPosition, updateEditingPosition] = useState(false);
  const [autoFillInProgress, setAutoFillInProgress] = useState(false);
  const pub = app.useOne<Publication, string>("publications", pubId).object;
  const latestAnnex = useLatestAnnex(pubId, issueId);
  const lang = useContext(LangConfigContext);

  const pubUrl = pub ? pub.url : undefined;

  let previousAnnexDetails: JSX.Element;
  if (latestAnnex) {
    const date = latestAnnex.positionOn;
    if (date) {
      previousAnnexDetails = (
        <>
          Superseding position <DateStamp date={date} />, previously annexed to
          OB {latestAnnex.annexedTo.id}.
        </>
      );
    } else {
      previousAnnexDetails = (
        <>
          Superseding unknown position, previously annexed to OB{" "}
          {latestAnnex.annexedTo.id}.
        </>
      );
    }
  } else {
    previousAnnexDetails = (
      <>No positions annexed to preceding OB issues found for this SP.</>
    );
  }

  let currentPosition: JSX.Element;
  if (!onChange && !position) {
    currentPosition = <em>unspecified</em>;
  } else {
    currentPosition = (
      <Button
        small
        disabled={!onChange || editingPosition}
        className={styles.editPositionToggle}
        title="Click to set or change the annexed position."
        intent={position || editingPosition ? undefined : "primary"}
        onClick={() => updateEditingPosition(true)}
      >
        {position !== null ? (
          <DateStamp date={position.position_on} />
        ) : (
          "Specify"
        )}
      </Button>
    );
  }

  let dataEditor: JSX.Element | null;
  if (editingPosition) {
    dataEditor = null;
  } else if (position?.datasets !== undefined) {
    dataEditor = (
      <AnnexedPositionDataEditor
        datasets={position.datasets || {}}
        onChange={
          onChange
            ? (datasets) => {
                if (Object.keys(datasets).length < 1) {
                  onChange(pubId, update(position, { $unset: ["datasets"] }));
                } else {
                  onChange(
                    pubId,
                    update(position, { datasets: { $set: datasets } })
                  );
                }
              }
            : undefined
        }
      />
    );
  } else if (position !== null) {
    const autoFillPossible =
      latestAnnex?.annexedTo.annexes[pubId]?.datasets !== undefined;

    dataEditor = (
      <NonIdealState
        title="No datasets to show"
        description={
          onChange ? (
            <>
              {autoFillPossible ? (
                <>
                  <Button
                    large
                    intent="primary"
                    title="Load previously annexed version and apply any subsequent amendments."
                    disabled={autoFillInProgress}
                    loading={autoFillInProgress}
                    onClick={autoFillDatasets}
                  >
                    Auto-fill datasets
                  </Button>
                  <br />
                  <br />
                </>
              ) : null}
              <Button
                onClick={() =>
                  onChange(pubId, {
                    ...position,
                    datasets: { main: getDatasetStub(lang.default) },
                  })
                }
                large={!autoFillPossible}
                intent={!autoFillPossible ? "primary" : undefined}
              >
                Create a dataset
              </Button>
            </>
          ) : undefined
        }
      />
    );
  } else {
    dataEditor = (
      <NonIdealState
        title="Position not specified"
        description={
          onChange && !editingPosition ? (
            <Callout intent="primary" style={{ textAlign: "left" }}>
              <p>
                For an <abbr title="Service Publication">SP</abbr> that&nbsp;was
                or&nbsp;will&nbsp;be&nbsp;annexed multiple times
                to&nbsp;different OB&nbsp;issues,
                the&nbsp;specific&nbsp;position annexed&nbsp;to&nbsp;
                <em>this</em> OB&nbsp;issue must&nbsp;be specified.
              </p>
              <p>
                The&nbsp;annexed&nbsp;position is&nbsp;often
                (but&nbsp;not&nbsp;always) identical
                to&nbsp;publication&nbsp;date for&nbsp;this OB&nbsp;issue.
              </p>
              <Button
                large
                onClick={() => updateEditingPosition(true)}
                intent="primary"
              >
                Specify position
              </Button>
            </Callout>
          ) : undefined
        }
      />
    );
  }

  async function autoFillDatasets() {
    if (autoFillInProgress || !onChange) {
      return;
    }

    setAutoFillInProgress(true);

    const datasets = (
      await callIPC<
        { forPubID: string; asOfIssueID: number },
        { datasets?: PositionDatasets }
      >("model-issues-auto-fill-datasets", {
        forPubID: pubId,
        asOfIssueID: issueId,
      })
    ).datasets;

    if (datasets !== undefined) {
      onChange(pubId, update(position, { datasets: { $set: datasets } }));
    }

    setAutoFillInProgress(false);
  }

  return (
    <>
      <div className={sharedStyles.messageEditorPaneHeader}>
        <PaneHeader
          align="left"
          major={true}
          actions={
            <HelpButton className="big-icon-button" path="annex-publication/" />
          }
        >
          <small>Annex</small>
          &ensp;
          <a onClick={() => app.openObjectEditor("publications", pubId)}>
            <PublicationTitle id={pubId} />
          </a>
        </PaneHeader>

        <div className={sharedStyles.editorMeta}>
          {pub && pub.recommendation ? (
            <Text ellipsize={true}>
              Per <RecommendationTitle rec={pub.recommendation} />
            </Text>
          ) : null}
          {(pubUrl || "").trim() !== "" ? (
            <Text ellipsize={true}>
              SP resource:{" "}
              <a onClick={() => shell.openExternal(`${pubUrl}`)}>{pubUrl}</a>
            </Text>
          ) : null}

          <div>{previousAnnexDetails}</div>

          {position || (onChange && editingPosition) ? (
            <FormGroup
              className={styles.editPositionForm}
              helperText={
                editingPosition
                  ? "Annexed position is expressed as a date."
                  : undefined
              }
              label={
                <>
                  Position presently annexed: &ensp;
                  {currentPosition}
                </>
              }
            >
              {onChange && editingPosition ? (
                <DatePicker
                  value={position?.position_on}
                  canClearSelection={true}
                  showActionsBar={true}
                  onChange={(newDate: Date | null) => {
                    if (newDate !== null) {
                      onChange(pubId, {
                        ...(position || {}),
                        position_on: newDate,
                      });
                    } else {
                      onChange(pubId, null);
                    }
                    updateEditingPosition(false);
                  }}
                />
              ) : null}
            </FormGroup>
          ) : null}
        </div>
      </div>

      {dataEditor}
    </>
  );
};

function getDatasetStub(lang: string): Dataset {
  return {
    meta: {
      schema: {
        type: "array",
        item: {
          type: "object",
          fields: [
            {
              type: "text",
              id: "id",
              required: true,
              label: { [lang]: "Object ID" },
            },
          ],
        },
      },
    },
    contents: {},
  };
}
