/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {Select} from 'antd';
import React from 'react';

type PowerSearchEnumTermProps = {
  onCancel: () => void;
  onChange: (value: string) => void;
  enumLabels: {[key: string]: string};
};

export const PowerSearchEnumTerm: React.FC<PowerSearchEnumTermProps> = ({
  onCancel,
  onChange,
  enumLabels,
}) => {
  const options = React.useMemo(() => {
    return Object.entries(enumLabels).map(([key, label]) => ({
      label,
      value: key,
    }));
  }, [enumLabels]);

  const selectValueRef = React.useRef<string>();

  return (
    <Select
      autoFocus
      style={{width: 100}}
      placeholder="..."
      options={options}
      defaultOpen
      onBlur={() => {
        if (!selectValueRef.current) {
          onCancel();
        }
      }}
      onSelect={(value) => {
        selectValueRef.current = value;
        onChange(value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.currentTarget.blur();
        }
      }}
    />
  );
};
