/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {
  DataInspector,
  Layout,
  produce,
  theme,
  TimelineDataDescription,
} from 'flipper-plugin';
import {
  FrameworkEvent,
  ClientNode,
  FrameworkEventType,
  FrameworkEventMetadata,
} from '../../../ClientTypes';
import React, {ReactNode, useState} from 'react';
import {StackTraceInspector} from './StackTraceInspector';
import {
  Badge,
  Button,
  Descriptions,
  Dropdown,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {frameworkEventSeparator} from '../../shared/FrameworkEventsTreeSelect';
import {last, startCase, uniqBy} from 'lodash';
import {FilterOutlined, TableOutlined} from '@ant-design/icons';
import {ViewMode} from '../../../DesktopTypes';
import {MultiSelectableDropDownItem} from '../../shared/MultiSelectableDropDownItem';

type Props = {
  node: ClientNode;
  events: readonly FrameworkEvent[];
  showExtra?: (title: string, element: ReactNode) => void;
  frameworkEventMetadata: Map<FrameworkEventType, FrameworkEventMetadata>;
  onSetViewMode: (viewMode: ViewMode) => void;
};

export const FrameworkEventsInspector: React.FC<Props> = ({
  node,
  events,
  showExtra,
  frameworkEventMetadata,
  onSetViewMode,
}) => {
  const allThreads = uniqBy(events, 'thread').map((event) => event.thread);
  const [filteredThreads, setFilteredThreads] = useState<Set<string>>(
    new Set(),
  );

  const allEventTypes = uniqBy(events, 'type').map((event) => event.type);
  const [filteredEventTypes, setFilteredEventTypes] = useState<Set<string>>(
    new Set(),
  );

  const filteredEvents = events
    .filter(
      (event) =>
        filteredEventTypes.size === 0 || filteredEventTypes.has(event.type),
    )
    .filter(
      (event) =>
        filteredThreads.size === 0 || filteredThreads.has(event.thread!),
    );

  return (
    <Layout.Container gap="small" padv="small">
      <Layout.Right center gap>
        <Typography.Title level={3}>Event timeline</Typography.Title>

        <Layout.Horizontal center gap padh="medium">
          {node.tags.includes('TreeRoot') && (
            <Tooltip title="Explore all tree events in table">
              <Button
                shape="circle"
                icon={<TableOutlined />}
                onClick={() =>
                  onSetViewMode({
                    mode: 'frameworkEventsTable',
                    treeRootId: node.id,
                  })
                }
              />
            </Tooltip>
          )}
          <Dropdown
            overlayStyle={{minWidth: 200}}
            overlay={
              <Layout.Container
                gap="small"
                pad="small"
                style={{
                  backgroundColor: theme.white,
                  borderRadius: theme.borderRadius,
                  boxShadow: `0 0 4px 1px rgba(0,0,0,0.10)`,
                }}>
                {allThreads.length > 1 && (
                  <>
                    <Typography.Text strong>By thread</Typography.Text>
                    {allThreads.map((thread) => (
                      <MultiSelectableDropDownItem
                        onSelect={(thread, selected) => {
                          setFilteredThreads((cur) =>
                            produce(cur, (draft) => {
                              if (selected) {
                                draft.add(thread);
                              } else {
                                draft.delete(thread);
                              }
                            }),
                          );
                        }}
                        selectedValues={filteredThreads}
                        key={thread}
                        value={thread as string}
                        text={startCase(thread) as string}
                      />
                    ))}
                  </>
                )}

                {allEventTypes.length > 1 && (
                  <>
                    <Typography.Text strong>By event type</Typography.Text>
                    {allEventTypes.map((eventType) => (
                      <MultiSelectableDropDownItem
                        onSelect={(eventType, selected) => {
                          setFilteredEventTypes((cur) =>
                            produce(cur, (draft) => {
                              if (selected) {
                                draft.add(eventType);
                              } else {
                                draft.delete(eventType);
                              }
                            }),
                          );
                        }}
                        selectedValues={filteredEventTypes}
                        key={eventType}
                        value={eventType as string}
                        text={last(eventType.split('.')) as string}
                      />
                    ))}
                  </>
                )}
              </Layout.Container>
            }>
            <Button
              shape="circle"
              icon={
                <Badge
                  offset={[8, -8]}
                  size="small"
                  count={filteredEventTypes.size + filteredThreads.size}>
                  <FilterOutlined style={{}} />
                </Badge>
              }
            />
          </Dropdown>
        </Layout.Horizontal>
      </Layout.Right>

      <TimelineDataDescription
        key={node.id}
        canSetCurrent={false}
        onClick={(current) => {
          const idx = parseInt(current, 10);
          const event = filteredEvents[idx];
          showExtra?.(
            'Event details',
            <EventDetails
              frameworkEventMetadata={frameworkEventMetadata.get(event.type)}
              event={event}
              node={node}
            />,
          );
        }}
        timeline={{
          time: filteredEvents.map((event, idx) => {
            return {
              moment: event.timestamp,
              display: `${eventTypeToName(event.type)}`,
              color: threadToColor(event.thread),
              key: idx.toString(),
            };
          }),
          current: 'initialNone',
        }}
      />
    </Layout.Container>
  );
};

function EventDetails({
  event,
  node,
  frameworkEventMetadata,
}: {
  frameworkEventMetadata?: FrameworkEventMetadata;
  event: FrameworkEvent;
  node: ClientNode;
}) {
  const stackTrace =
    event?.attribution?.type === 'stacktrace' ? (
      <StackTraceInspector
        stacktrace={event.attribution.stacktrace}
        tags={node.tags}
      />
    ) : null;

  const details = (
    <Layout.Container>
      <Descriptions size="small" bordered column={1}>
        <Descriptions.Item label="Event type">{event.type}</Descriptions.Item>
        {frameworkEventMetadata && (
          <Descriptions.Item label="Event documentation">
            {frameworkEventMetadata?.documentation}
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Thread">
          <Tag color={threadToColor(event.thread)}>{event.thread}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Timestamp">
          {formatTimestamp(event.timestamp)}
        </Descriptions.Item>
        {event.duration && (
          <Descriptions.Item label="Duration">
            {formatDuration(event.duration)}
          </Descriptions.Item>
        )}
        {event.payload && Object.keys(event.payload).length > 0 && (
          <Descriptions.Item label="Attributes">
            <DataInspector data={event.payload} />
          </Descriptions.Item>
        )}
      </Descriptions>
    </Layout.Container>
  );

  return (
    <Layout.Horizontal>
      {details}
      {stackTrace}
    </Layout.Horizontal>
  );
}

const options: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
};
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);

  const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);
  const milliseconds = date.getMilliseconds();

  return `${formattedDate}.${milliseconds.toString().padStart(3, '0')}`;
}

function formatDuration(nanoseconds: number): string {
  if (nanoseconds < 1_000) {
    return `${nanoseconds} nanoseconds`;
  } else if (nanoseconds < 1_000_000) {
    return `${(nanoseconds / 1_000).toFixed(2)} microseconds`;
  } else if (nanoseconds < 1_000_000_000) {
    return `${(nanoseconds / 1_000_000).toFixed(2)} milliseconds`;
  } else if (nanoseconds < 1_000_000_000_000) {
    return `${(nanoseconds / 1_000_000_000).toFixed(2)} seconds`;
  } else {
    return `${(nanoseconds / (1_000_000_000 * 60)).toFixed(2)} minutes`;
  }
}
function eventTypeToName(eventType: string) {
  return eventType.slice(eventType.lastIndexOf(frameworkEventSeparator) + 1);
}

function threadToColor(thread?: string) {
  return thread === 'main' ? theme.warningColor : theme.primaryColor;
}