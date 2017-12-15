'use strict';

require('./kite-logo');

const fs = require('fs');
const path = require('path');
const {CompositeDisposable, TextEditor} = require('atom');
const {DisposableEvent, addDelegatedEventListener, parent, delayPromise} = require('../utils');
const {StateController, utils: {retryPromise}} = require('kite-installer');
const Plan = require('../plan');
const LinkScheme = require('../link-scheme');
const DataLoader = require('../data-loader');
const {MAX_FILE_SIZE} = require('../constants');

const {STATES} = StateController;
const dot = '<span class="dot">•</span>';
const proLogoSvg = String(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'kitepro.svg')));
const enterpriseLogoSvg = String(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'kiteenterprise.svg')));
const pluralize = (n, singular, plural) => n === 1 ? singular : plural;

class KiteStatusPanel extends HTMLElement {
  static initClass() {
    return document.registerElement('kite-status-panel', {
      prototype: this.prototype,
    });
  }

  setApp(app) {
    this.app = app;
  }

  hide() {
    if (this.parentNode) {
      this.parentNode.removeChild((this));
      this.subscriptions.dispose();
    }
  }

  pendingStatus(label) {
    const status = this.querySelector('.status');

    if (status) {
      status.innerHTML = `
      ${label}
      <span class='loading loading-spinner-small inline-block'></span>
      `;
    }
  }

  show(target) {
    return this.renderCurrent().then(() => {
      document.body.appendChild(this);

      this.setPosition(target);

      this.scheme = new LinkScheme('kite-atom-internal', this);

      this.subscriptions = new CompositeDisposable();

      this.subscriptions.add(this.scheme);

      this.subscriptions.add(this.scheme.onDidClickLink(opts => this.handleAction(opts)));

      this.subscriptions.add(atom.workspace.onDidChangeActivePaneItem(item => {
        if (item instanceof TextEditor) {
          this.renderCurrent().then(() => this.setPosition(target));
        }
      }));

      this.subscriptions.add(addDelegatedEventListener(this, 'click', '.kite-warning-box [data-method="post"]', (e) => {
        const link = e.target;
        const box = parent(link, '.kite-warning-box');

        link.innerHTML = '<span class=\'loading loading-spinner-tiny inline-block\'></span>';
        link.style.pointerEvents = 'none';

        StateController.client.request({
          path: '/api/account/resendVerification',
          method: link.getAttribute('data-method'),
        })
        .then(resp => {
          if (resp.statusCode === 200) {
            box.classList.remove('kite-warning-box');
            box.classList.add('kite-info-box');
            box.textContent = link.getAttribute('data-confirmation');
          } else {
            throw new Error(link.getAttribute('data-failure'));
          }
        })
        .catch(err => {
          box.innerHTML = err.message;
        });
      }));

      this.subscriptions.add(new DisposableEvent(window, 'resize', e => {
        this.setPosition(target);
      }));

      this.subscriptions.add(new DisposableEvent(document.body, 'click', e => {
        const {top, left, right, bottom} = this.getBoundingClientRect();
        const {pageX, pageY} = e;

        if (pageX < left || pageX > right || pageY < top || pageY > bottom) {
          this.hide();
        }
      }));
    });
  }

  pauseNotifications() {
    this.app.kite && this.app.kite.notifications.pauseNotifications();
  }

  resumeNotifications() {
    this.app.kite && this.app.kite.notifications.resumeNotifications();
  }

  handleAction({url}) {
    this.pauseNotifications();

    let promise;
    switch (url.host) {
      case 'install':
        this.pendingStatus('Installing Kite');
        this.installing = true;
        promise = this.app.install()
        .then(() => this.app.start())
        .then(() => retryPromise(() => StateController.isUserAuthenticated(), 10, 500))
        .catch(err => {
          console.log(err);
          if (err.data !== 4) {
            throw err;
          }
        })
        .then(() => { this.installing = false; })
        .catch(() => { this.installing = false; });
        break;
      case 'start':
        this.pendingStatus('Launching Kite');
        this.starting = true;
        promise = this.app.start()
        .then(() => retryPromise(() => StateController.isUserAuthenticated(), 10, 500))
        .then(() => { this.starting = false; });
        break;
      case 'start-enterprise':
        this.pendingStatus('Launching Kite');
        this.starting = true;
        promise = this.app.startEnterprise()
        .then(() => delayPromise(() => Promise.resolve(), 3000))
        .then(() => { this.starting = false; });
        break;
      case 'login':
        this.pendingStatus('Login to Kite');
        promise = this.app.login();
        break;
      case 'whitelist':
        this.pendingStatus('Whitelisting path');
        promise = this.app.whitelist(url.path.replace(/^\//, ''))
        .then(() => {
          const editor = atom.workspace.getActiveTextEditor();
          const kiteEditor = this.app.kite.kiteEditorForEditor(editor);

          if (kiteEditor) {
            return kiteEditor.initialize();
          } else {
            return this.app.kite.subscribeToEditor(editor);
          }

        });
        break;
    }

    if (promise) {
      promise
      .then(() => this.renderCurrent())
      .then(() => this.resumeNotifications())
      .catch(err => console.error(err));
    } else {
      this.resumeNotifications();
    }
  }

  setPosition(target) {
    if (!target) { return; }

    const box = target.getBoundingClientRect();

    this.style.cssText = `
    top: ${Math.round(box.top - 20)}px;
    left: ${Math.round(box.right)}px;
    `;
  }

  renderCurrent() {
    if (this.installing || this.starting) { return Promise.resolve(); }
    const editor = atom.workspace.getActiveTextEditor();
    const promises = [
      Plan.queryPlan(),
      StateController.handleState().then(state => {
        return Promise.all([
          StateController.isKiteInstalled().then(() => true, () => false),
          StateController.isKiteEnterpriseInstalled().then(() => true, () => false),
        ]).then(([kiteInstalled, kiteEnterpriseInstalled]) => {
          return {
            state,
            kiteInstalled,
            kiteEnterpriseInstalled,
          };
        });
      }),
      DataLoader.getUserAccountInfo().catch(() => {}),
      DataLoader.getStatus(editor),
    ];
    if (editor && this.app.isGrammarSupported(editor)) {
      promises.push(DataLoader.projectDirForEditor(editor).catch(() => null));
      promises.push(DataLoader.shouldOfferWhitelist(editor).catch(() => null));
    }

    return Promise.all(promises).then(data => {
      this.render(...data);
    });
  }

  render(plan, status, account, syncStatus, projectDir, shouldOfferWhitelist) {
    this.innerHTML = `
      ${this.renderSubscription(plan, status)}
      ${this.renderEmailWarning(account)}
      ${this.renderReferralsCredited()}
      ${this.renderLinks(account)}
      ${this.renderStatus(status, syncStatus, projectDir, shouldOfferWhitelist)}
    `;
  }

  renderLinks(account) {
    let giftLink = '';

    if (!Plan.isEnterprise()) {
      if (Plan.referralsCredited() < Plan.referralsCredits()) {
        giftLink = `<li>
        <a is="kite-localtoken-anchor"
        href="http://localhost:46624/redirect/invite"
        class="kite-gift account-dependent">Get free Pro! <i class="icon-kite-gift"></i></a>
        </li>`;
      } else {
        giftLink = `<li>
        <a is="kite-localtoken-anchor"
        href="http://localhost:46624/redirect/invite"
        class="kite-gift account-dependent">Invite friends <i class="icon-kite-gift"></i></a>
        </li>`;
      }
    }

    return `
    <ul class="links ${account ? 'has-account' : 'no-account'}">
      ${giftLink}
      <li><a href="localhost:46624/clientapi/desktoplogin?d=/docs" class="account-dependent">Search Python documentation</a></li>
      <li><a is="kite-localtoken-anchor"
           class="account-dependent"
           href="http://localhost:46624/settings">Settings</a></li>
      <li><a href="http://localhost:46624/settings/permissions" class="account-dependent">Permissions</a></li>
      <li><a href="http://help.kite.com/">Help</a></li>
    </ul>
    `;
  }

  renderEmailWarning(account) {
    return !account || account.email_verified
      ? ''
      : `<div class="kite-warning-box">
        Please verify your email address

        <div  class="actions">
          <a href="/api/account/resendVerification"
          data-method="post"
          data-failure="We were unable to send a verification email,<br/>please contact feedback@kite.com."
          data-confirmation="A new verification email was sent to ${account.email}">Resend email</a>
        </div>
      </div>`;
  }

  renderReferralsCredited() {
    return '';
    // return Plan.hasReferralCredits()
    //   ? `<div class="kite-info-box">
    //     ${Plan.referralsCredited()}
    //     ${pluralize(Plan.referralsCredited(), 'user', 'users')}
    //     accepted your invite.<br/>We've credited
    //     ${Plan.daysCredited()}
    //     ${pluralize(Plan.daysCredited(), 'day', 'days')}
    //     of Kite Pro to your account!
    //     <div class="actions">
    //       <a is="kite-localtoken-anchor"
    //          href="http://localhost:46624/redirect/invite">Invite more people</a>
    //     </div>
    //   </div>`
    //   : '';
  }

  renderStatus(status, syncStatus, projectDir, shouldOfferWhitelist) {
    let content = '';
    switch (status.state) {
      case STATES.UNSUPPORTED:
        content = `<div class="text-danger">Kite engine is not available on your system ${dot}</div>`;
        break;

      case STATES.UNINSTALLED:
        content = `
          <div class="text-danger">Kite engine is not installed ${dot}</div>
          <a href="kite-atom-internal://install" class="btn btn-error">Install now</a>
        `;
        break;
      case STATES.INSTALLED: {
        if (StateController.hasManyKiteInstallation() || StateController.hasManyKiteEnterpriseInstallation()) {
          content = `<div class="text-danger">Kite engine is not running ${dot}<br/>
          You have multiple versions of Kite installed. Please launch your desired one.</div>`;
        } else if (status.kiteInstalled && status.kiteEnterpriseInstalled) {
          content = `
          <div class="text-danger">Kite engine is not running ${dot}<br/>
          Which version of kite do you want to launch?</div>
          <a href="kite-atom-internal://start-enterprise"
             class="btn btn-purple">Launch Kite Enterprise</a><br/>
          <a href="kite-atom-internal://start" class="btn btn-info">Launch Kite cloud</a>`;
        } else if (status.kiteInstalled) {
          content = `<div class="text-danger">Kite engine is not running ${dot}</div>
          <a href="kite-atom-internal://start" class="btn btn-error">Launch now</a>`;
        } else {
          content = `<div class="text-danger">Kite engine is not running ${dot}</div>
          <a href="kite-atom-internal://start-enterprise" class="btn btn-error">Launch now</a>`;
        }
        break;
      }
      case STATES.RUNNING:
        content = `
          <div class="text-danger">Kite engine is not reachable</div>
        `;
        break;
      case STATES.REACHABLE:
        content = `
          <div class="text-danger">Kite engine is not logged in ${dot}</div>
          <a href="kite-atom-internal://login" class="btn btn-error">Login now</a>
        `;
        break;
      case STATES.AUTHENTICATED:
        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
          content = `<div>Open a supported file to see Kite's status ${dot}</div>`;
        } else if (!this.app.isGrammarSupported(editor)) {
          content = `<div>Open a supported file to see Kite's status ${dot}</div>`;
        } else if (this.app.kite.isEditorWhitelisted(editor)) {
          if (editor && editor.getText().length >= MAX_FILE_SIZE) {
            content = `
            <div class="text-warning">The current file is too large for Kite to handle ${dot}</div>`;
          } else {
            switch (syncStatus.status) {
              case '':
              case 'ready':
                content = `<div class="ready">Kite engine is ready and working ${dot}</div>`;
                break;

              case 'indexing':
                content = `<div class="ready">Kite engine is indexing your code ${dot}</div>`;
                break;

              case 'syncing':
                content = `<div class="ready">Kite engine is syncing your code ${dot}</div>`;
                break;
            }
          }
        } else {
          const path = encodeURI(editor.getPath());
          const settingsURL = `http://localhost:46624/settings/permissions?filename=${path}`;
          content = shouldOfferWhitelist
            ? `<div class="text-warning">Kite engine is not enabled for this file ${dot}</div>
              <a href="kite-atom-internal://whitelist/${projectDir}"
                    class="btn btn-warning">Enable for ${projectDir}</a><br/>
              <a href="${settingsURL}" class="btn btn-warning">Whitelist settings…</a>`
            : `<div>The current file is ignored by Kite ${dot}</div>
              <a href="${settingsURL}" class="btn btn-default">Whitelist settings…</a>`;
        }

        break;
    }

    return `<div class="status">${content}</div>`;
  }

  renderSubscription(plan, status) {
    if (!plan || (status && status.state < STATES.AUTHENTICATED)) {
      return '<div class="text-error subscription">Unable to retrieve plan information</div>';
    }

    let leftSide = '';
    let rightSide = '';

    if (Plan.isEnterprise()) {
      leftSide = `<div class="enterprise">${enterpriseLogoSvg}</div>`;
      rightSide = `<a is="kite-localtoken-anchor"
                      href="http://localhost:46624/clientapi/desktoplogin?d=/settings/acccount">Account</a>`;
    } else if (!Plan.isPro() && Plan.isActive()) {
      leftSide = '<kite-logo small></kite-logo> Kite Basic';

      if (Plan.hasStartedTrial()) {
        rightSide = `<a is="kite-localtoken-anchor"
                     href="http://localhost:46624/redirect/pro">Upgrade</a>`;
      } else {
        rightSide = `<a is="kite-localtoken-anchor"
                     href="http://localhost:46624/redirect/trial">Start Pro trial</a>`;
      }
    } else if (Plan.isPro()) {
      leftSide = `<div class="pro">${proLogoSvg}</div>`;


      if (Plan.isTrialing() || Plan.hasReferralCredits()) {
        const days = Plan.remainingTrialDays();
        const remains = [
          days,
          pluralize(days, 'day', 'days'),
          'left',
        ];

        if (Plan.isTrialing()) {
          remains.unshift('Trial:');
        }

        if (days < 5) {
          leftSide += `<span class="kite-trial-days text-danger">${remains.join(' ')}</span>`;
        } else {
          leftSide += `<span class="kite-trial-days ">${remains.join(' ')}</span>`;
        }

        rightSide = `<a is="kite-localtoken-anchor"
                        href="http://localhost:46624/redirect/pro">Upgrade</a>`;
      } else {
        rightSide = `<a is="kite-localtoken-anchor"
                        href="http://localhost:46624/clientapi/desktoplogin?d=/settings/acccount">Account</a>`;
      }
    }

    return `<div class="split-line subscription">
      <div class="left">${leftSide}</div>
      <div class="right">${rightSide}</div>
    </div>`;
  }
}

module.exports = KiteStatusPanel.initClass();
