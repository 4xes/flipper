/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Layout} from '../ui';
import React, {CSSProperties, useState} from 'react';
import {
  createDataSource,
  DataFormatter,
  DataInspector,
  DataTable,
  DataTableColumn,
  theme,
  styled,
} from 'flipper-plugin';
import {CloseCircleFilled, DeleteOutlined} from '@ant-design/icons';
import {
  CommandRecordEntry,
  ConnectionRecordEntry,
  FlipperServer,
} from 'flipper-common';
import {Button} from 'antd';

const rows = createDataSource<ConnectionRecordEntry>([], {
  limit: 200000,
  persist: 'connectivity-logs',
});

export function enableConnectivityHook(flipperServer: FlipperServer) {
  flipperServer.on(
    'connectivity-troubleshoot-log',
    (entry: ConnectionRecordEntry) => {
      rows.append(entry);
    },
  );
  flipperServer.on(
    'connectivity-troubleshoot-cmd',
    (entry: CommandRecordEntry) => {
      rows.append(entry);
    },
  );
}

const iconStyle = {
  fontSize: '16px',
};

const baseRowStyle = {
  ...theme.monospace,
};

const logTypes: {
  [level: string]: {
    label: string;
    icon?: React.ReactNode;
    style?: CSSProperties;
    enabled: boolean;
  };
} = {
  log: {
    label: 'Log',
    enabled: true,
  },
  cmd: {
    label: 'Shell',
    enabled: true,
    style: {
      ...baseRowStyle,
      color: theme.primaryColor,
    },
    icon: <CloseCircleFilled style={iconStyle} />,
  },
  error: {
    label: 'Error',
    style: {
      ...baseRowStyle,
      color: theme.errorColor,
    },
    icon: <CloseCircleFilled style={iconStyle} />,
    enabled: true,
  },
};

function createColumnConfig(): DataTableColumn<ConnectionRecordEntry>[] {
  return [
    {
      key: 'time',
      title: 'Time',
      width: 160,
    },
    {
      key: 'device',
      title: 'Device',
      width: 160,
    },
    {
      key: 'app',
      title: 'App',
      width: 160,
      visible: true,
    },
    {
      key: 'medium',
      title: 'Medium',
      width: 80,
      visible: true,
    },
    {
      key: 'message',
      title: 'Message',
      wrap: true,
      formatters: [
        DataFormatter.truncate(400),
        DataFormatter.prettyPrintJson,
        DataFormatter.linkify,
      ],
    },
  ];
}

const columns = createColumnConfig();

function getRowStyle(entry: ConnectionRecordEntry): CSSProperties | undefined {
  return (logTypes[entry.type]?.style as any) ?? baseRowStyle;
}

const Placeholder = styled(Layout.Container)({
  center: true,
  color: theme.textColorPlaceholder,
  fontSize: 18,
});

function Sidebar({selection}: {selection: undefined | ConnectionRecordEntry}) {
  return (
    <Layout.ScrollContainer pad>
      {selection != null ? (
        <DataInspector data={selection} expandRoot />
      ) : (
        <Placeholder grow pad="large">
          Select an entry to visualize details
        </Placeholder>
      )}
    </Layout.ScrollContainer>
  );
}

function clearMessages() {
  rows.clear();
}

export const ConnectivityLogs = () => {
  const [selection, setSelection] = useState<
    ConnectionRecordEntry | undefined
  >();

  const clearButton = (
    <Button
      title="Clear logs"
      onClick={() => {
        setSelection(undefined);
        clearMessages();
      }}>
      <DeleteOutlined />
    </Button>
  );

  return (
    <Layout.Right resizable width={400}>
      <DataTable<ConnectionRecordEntry>
        dataSource={rows}
        columns={columns}
        enableAutoScroll
        onRowStyle={getRowStyle}
        onSelect={setSelection}
        extraActions={clearButton}
      />
      <Sidebar selection={selection} />
    </Layout.Right>
  );
};
