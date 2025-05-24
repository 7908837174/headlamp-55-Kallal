/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import { styled } from '@mui/system';
import { Terminal as XTerminal } from '@xterm/xterm';
import _ from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { KubeContainerStatus } from '../../lib/k8s/cluster';
import Pod from '../../lib/k8s/pod';
import { LightTooltip } from '../common';
import { LogViewer, LogViewerProps } from '../common/LogViewer';

const PaddedFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
  margin: 0,
  paddingTop: theme.spacing(2),
  paddingRight: theme.spacing(2),
}));

interface PodLogViewerProps extends Omit<LogViewerProps, 'logs'> {
  item: Pod;
}

export function PodLogViewer(props: PodLogViewerProps) {
  const { item, onClose, open, ...other } = props;
  const [container, setContainer] = React.useState(getDefaultContainer());
  const [showPrevious, setShowPrevious] = React.useState<boolean>(false);
  const [showTimestamps, setShowTimestamps] = React.useState<boolean>(true);
  const [follow, setFollow] = React.useState<boolean>(true);
  const [lines, setLines] = React.useState<number>(100);
  const [logs, setLogs] = React.useState<{ logs: string[]; lastLineShown: number }>({
    logs: [],
    lastLineShown: -1,
  });
  const [showReconnectButton, setShowReconnectButton] = React.useState(false);
  const [cancelLogsStream, setCancelLogsStream] = React.useState<(() => void) | null>(null);
  const xtermRef = React.useRef<XTerminal | null>(null);
  const { t } = useTranslation();

  function getDefaultContainer() {
    return item.spec.containers.length > 0 ? item.spec.containers[0].name : '';
  }

  const options = { leading: true, trailing: true, maxWait: 1000 };
  function setLogsDebounced(logLines: string[]) {
    setLogs(current => {
      if (current.lastLineShown >= logLines.length) {
        xtermRef.current?.clear();
        xtermRef.current?.write(logLines.join('').replaceAll('\n', '\r\n'));
      } else {
        xtermRef.current?.write(
          logLines
            .slice(current.lastLineShown + 1)
            .join('')
            .replaceAll('\n', '\r\n')
        );
      }

      return {
        logs: logLines,
        lastLineShown: logLines.length - 1,
      };
    });
    // If we stopped following the logs and we have logs already,
    // then we don't need to fetch them again.
    if (!follow && logs.logs.length > 0) {
      xtermRef.current?.write(
        '\n\n' +
          t('translation|Logs are paused. Click the follow button to resume following them.') +
          '\r\n'
      );
      return;
    }
  }
  const debouncedSetState = _.debounce(setLogsDebounced, 500, options);

  React.useEffect(
    () => {
      let callback: any = null;

      if (props.open) {
        xtermRef.current?.clear();
        setLogs({ logs: [], lastLineShown: -1 });

        callback = item.getLogs(container, debouncedSetState, {
          tailLines: lines,
          showPrevious,
          showTimestamps,
          follow,
          /**
           * When the connection is lost, show the reconnect button.
           * This will stop the current log stream.
           */
          onReconnectStop: () => {
            setShowReconnectButton(true);
          },
        });
      }

      return function cleanup() {
        if (callback) {
          callback();
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [container, lines, open, showPrevious, showTimestamps, follow]
  );

  function handleContainerChange(event: any) {
    setContainer(event.target.value);
  }

  function handleLinesChange(event: any) {
    setLines(event.target.value);
  }

  function handlePreviousChange() {
    setShowPrevious(previous => !previous);
  }

  function hasContainerRestarted() {
    const cont = item?.status?.containerStatuses?.find(
      (c: KubeContainerStatus) => c.name === container
    );
    if (!cont) {
      return false;
    }

    return cont.restartCount > 0;
  }

  function hasContainerCrashed() {
    const cont = item?.status?.containerStatuses?.find(
      (c: KubeContainerStatus) => c.name === container
    );
    if (!cont) {
      return false;
    }

    return !!cont.lastState?.terminated;
  }

  function canShowPreviousLogs() {
    return hasContainerRestarted() || hasContainerCrashed();
  }

  function handleTimestampsChange() {
    setShowTimestamps(timestamps => !timestamps);
  }

  function handleFollowChange() {
    setFollow(follow => !follow);
  }

  /**
   * Handle the reconnect button being clicked.
   * This will start a new log stream and hide the reconnect button.
   */
  function handleReconnect() {
    // If there's an existing log stream, cancel it
    if (cancelLogsStream) {
      cancelLogsStream();
    }

    // Start a new log stream
    const newCancelLogsStream = item.getLogs(container, debouncedSetState, {
      tailLines: lines,
      showPrevious,
      showTimestamps,
      follow,
      /**
       * When the connection is lost, show the reconnect button.
       * This will stop the current log stream.
       */
      onReconnectStop: () => {
        setShowReconnectButton(true);
      },
    });

    // Set the cancelLogsStream function to the new one
    setCancelLogsStream(() => newCancelLogsStream);

    // Hide the reconnect button
    setShowReconnectButton(false);
  }

  return (
    <LogViewer
      title={t('glossary|Logs: {{ itemName }}', { itemName: item.getName() })}
      downloadName={`${item.getName()}_${container}`}
      open={open}
      onClose={onClose}
      logs={logs.logs}
      xtermRef={xtermRef}
      handleReconnect={handleReconnect}
      showReconnectButton={showReconnectButton}
      topActions={[
        <FormControl sx={{ minWidth: '11rem' }}>
          <InputLabel shrink id="container-name-chooser-label">
            {t('glossary|Container')}
          </InputLabel>
          <Select
            labelId="container-name-chooser-label"
            id="container-name-chooser"
            value={container}
            onChange={handleContainerChange}
          >
            {item?.spec?.containers && (
              <MenuItem disabled value="">
                {t('glossary|Containers')}
              </MenuItem>
            )}
            {item?.spec?.containers.map(({ name }) => (
              <MenuItem value={name} key={name}>
                {name}
              </MenuItem>
            ))}
            {item?.spec?.initContainers && (
              <MenuItem disabled value="">
                {t('translation|Init Containers')}
              </MenuItem>
            )}
            {item.spec.initContainers?.map(({ name }) => (
              <MenuItem value={name} key={`init_container_${name}`}>
                {name}
              </MenuItem>
            ))}
            {item?.spec?.ephemeralContainers && (
              <MenuItem disabled value="">
                {t('glossary|Ephemeral Containers')}
              </MenuItem>
            )}
            {item.spec.ephemeralContainers?.map(({ name }) => (
              <MenuItem value={name} key={`eph_container_${name}`}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>,
        <FormControl sx={{ minWidth: '6rem' }}>
          <InputLabel shrink id="container-lines-chooser-label">
            {t('translation|Lines')}
          </InputLabel>
          <Select
            labelId="container-lines-chooser-label"
            id="container-lines-chooser"
            value={lines}
            onChange={handleLinesChange}
          >
            {[100, 1000, 2500].map(i => (
              <MenuItem value={i} key={i}>
                {i}
              </MenuItem>
            ))}
            <MenuItem value={-1}>All</MenuItem>
          </Select>
        </FormControl>,
        <LightTooltip
          title={
            canShowPreviousLogs()
              ? t('translation|Show logs for previous instances of this container.')
              : t(
                  'translation|You can only select this option for containers that have crashed or been restarted.'
                )
          }
        >
          <PaddedFormControlLabel
            label={t('translation|Show previous')}
            disabled={!canShowPreviousLogs()}
            control={
              <Switch
                checked={showPrevious}
                onChange={handlePreviousChange}
                name="checkPrevious"
                color="primary"
                size="small"
              />
            }
          />
        </LightTooltip>,
        <PaddedFormControlLabel
          label={t('translation|Timestamps')}
          control={
            <Switch
              checked={showTimestamps}
              onChange={handleTimestampsChange}
              name="checkTimestamps"
              color="primary"
              size="small"
            />
          }
        />,
        <PaddedFormControlLabel
          label={t('translation|Follow')}
          control={
            <Switch
              checked={follow}
              onChange={handleFollowChange}
              name="follow"
              color="primary"
              size="small"
            />
          }
        />,
      ]}
      {...other}
    />
  );
}