/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, {useEffect} from 'react';
import {
  TrackingScope,
  useLogger,
  _Sidebar,
  Layout,
  Dialog,
  _PortalsManager,
} from 'flipper-plugin';
import {Link, styled} from '../ui';
import {theme} from 'flipper-plugin';
import {Logger} from 'flipper-common';

import {Navbar} from './Navbar';
import {useStore} from '../utils/useStore';
import {AppInspect} from './appinspect/AppInspect';
import PluginContainer from '../PluginContainer';
import {ContentContainer} from './ContentContainer';
import {Notification} from './notification/Notification';
import {showChangelog} from '../chrome/ChangelogSheet';
import PlatformSelectWizard, {
  hasPlatformWizardBeenDone,
} from '../chrome/PlatformSelectWizard';
import PWAInstallationWizard, {
  shouldShowPWAInstallationWizard,
} from '../chrome/PWAppInstallationWizard';
import {getVersionString} from '../utils/versionString';
import config from '../fb-stubs/config';
import {WelcomeScreenStaticView} from './WelcomeScreen';
import fbConfig from '../fb-stubs/config';
import {isFBEmployee} from '../utils/fbEmployee';
import {notification} from 'antd';
import isProduction from '../utils/isProduction';
import {getRenderHostInstance} from 'flipper-frontend-core';

export function SandyApp() {
  const logger = useLogger();
  const leftSidebarVisible = useStore(
    (state) => state.application.leftSidebarVisible,
  );
  const topLevelSelection = useStore(
    (state) => state.application.topLevelSelection,
  );
  const staticView = useStore((state) => state.connections.staticView);

  useEffect(() => {
    document.title = `Flipper (${getVersionString()}${
      config.isFBBuild ? '@FB' : ''
    })`;

    registerStartupTime(logger);

    if (hasPlatformWizardBeenDone(window.localStorage)) {
      Dialog.showModal((onHide) => (
        <PlatformSelectWizard
          onHide={onHide}
          platform={
            getRenderHostInstance().serverConfig.environmentInfo.os.platform
          }
        />
      ));
    }

    if (shouldShowPWAInstallationWizard()) {
      console.info('Attempt to install PWA, launch installation wizard.');
      Dialog.showModal((onHide) => <PWAInstallationWizard onHide={onHide} />);
    }

    showChangelog(true);

    // don't warn about logger, even with a new logger we don't want to re-register
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (fbConfig.warnFBEmployees && isProduction()) {
      isFBEmployee()
        .then((isEmployee) => {
          if (isEmployee) {
            notification.warning({
              placement: 'bottomLeft',
              message: 'Please use Flipper@FB',
              description: (
                <>
                  You are using the open-source version of Flipper. Install the
                  internal build from{' '}
                  <Link href="munki://detail-Flipper">
                    Managed Software Center
                  </Link>{' '}
                  to get access to more plugins.
                </>
              ),
              duration: null,
            });
          }
        })
        .catch((e) => {
          console.warn('Failed to check if user is employee', e);
        });
    }
  }, []);

  const leftMenuContent = !leftSidebarVisible ? null : topLevelSelection ===
    'appinspect' ? (
    <AppInspect />
  ) : topLevelSelection === 'notification' ? (
    <Notification />
  ) : null;

  return (
    <RootElement>
      <Layout.Bottom>
        <Layout.Top gap={16}>
          <Navbar />
          <Layout.Left
            style={{
              paddingLeft: theme.space.large,
              paddingRight: theme.space.large,
            }}>
            <Layout.Horizontal>
              <_Sidebar width={250} minWidth={220} maxWidth={800} gutter>
                {leftMenuContent && (
                  <TrackingScope scope={topLevelSelection!}>
                    {leftMenuContent}
                  </TrackingScope>
                )}
              </_Sidebar>
            </Layout.Horizontal>
            <MainContainer>
              {staticView ? (
                <TrackingScope
                  scope={
                    (staticView as any).displayName ??
                    staticView.name ??
                    staticView.constructor?.name ??
                    'unknown static view'
                  }>
                  {staticView === WelcomeScreenStaticView ? (
                    React.createElement(staticView) /* avoid shadow */
                  ) : (
                    <ContentContainer>
                      {React.createElement(staticView, {
                        logger: logger,
                      })}
                    </ContentContainer>
                  )}
                </TrackingScope>
              ) : (
                <PluginContainer logger={logger} />
              )}
              {outOfContentsContainer}
            </MainContainer>
          </Layout.Left>
        </Layout.Top>
        <_PortalsManager />
      </Layout.Bottom>
    </RootElement>
  );
}

const outOfContentsContainer = (
  <div
    style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'none',
    }}>
    <div
      id="flipper-out-of-contents-container"
      style={{
        display: 'none',
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        top: 0,
      }}
    />
  </div>
);

const MainContainer = styled(Layout.Container)({
  background: theme.backgroundWash,
  padding: `0 ${theme.space.large}px ${theme.space.large}px 0`,
  overflow: 'hidden',
});

const RootElement = styled.div({
  display: 'flex',
  height: '100%',
  background: theme.backgroundWash,
});
RootElement.displayName = 'SandyAppRootElement';

function registerStartupTime(logger: Logger) {
  // track time since launch
  const launchEndTime = performance.now();
  const renderHost = getRenderHostInstance();
  renderHost.onIpcEvent('getLaunchTime', (launchStartTime: number) => {
    logger.track('performance', 'launchTime', launchEndTime - launchStartTime);
  });

  renderHost.sendIpcEvent('getLaunchTime');
  renderHost.sendIpcEvent('componentDidMount');
}
