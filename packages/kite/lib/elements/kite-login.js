'use strict';

const fs = require('fs');
const path = require('path');
const {Emitter, CompositeDisposable} = require('atom');
const {DisposableEvent} = require('../utils');

const logoSvg = String(fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo-small.svg')));

class KiteLogin extends HTMLElement {
  static initClass() {
    atom.commands.add('kite-login', {
      'core:cancel'() { this.cancel(); },
    });

    return document.registerElement('kite-login', {
      prototype: KiteLogin.prototype,
    });
  }

  createdCallback() {
    this.classList.add('native-key-bindings');
    this.setAttribute('tabindex', '-1');

    this.innerHTML = `
      <form>
        ${logoSvg}
        <div class="block has-password">
          <strong>Welcome to Kite!</strong><br/>
          <p>Sign up to get started or sign in  with your existing account</p>
        </div>
        <div class="block text-warning no-password">It looks like you didn't set a password for your account yet.</div>

        <div class="form-choice text-center">
          <span class='badge badge-medium selected'>Log in</span>
          <span class='badge badge-medium'>Create account</span>
        </div>

        <div class="form-status"></div>

        <div class="block has-password">
          <input class="input-text" name="email" type="text" placeholder="Email" tabindex="1">
        </div>

        <div class="block has-password">
          <input class="input-text" name="password" type="password" placeholder="Password" tabindex="2">
        </div>

        <div>
          <a class="reset-password pull-right has-password text-info for-login">Reset Password</a>
          <!--<a class="signup pull-right text-info"
             href="https://kite.com/">Signup</a>-->
          <button type="submit" class="submit btn btn-primary inline-block  has-password"><span class="for-login">Sign into Kite</span><span class="for-signup">Create account</span></button>
          <button type="button" class="cancel btn inline-block">Cancel</button>
          <button type="button" class="send-link no-password btn btn-primary inline-block">
            Resend password setup email
          </button>
        </div>
      </form>
    `;

    this.emailInput = this.querySelector('[name="email"]');
    this.passwordInput = this.querySelector('[name="password"]');
    this.submitBtn = this.querySelector('button.submit');
    this.resetBtn = this.querySelector('a.reset-password');
    this.cancelBtn = this.querySelector('button.cancel');
    this.sendLinkBtn = this.querySelector('button.send-link');
    this.loginBtn = this.querySelector('.badge.selected');
    this.signupBtn = this.querySelector('.badge:not(.selected)');
    this.form = this.querySelector('form');
    this.status = this.querySelector('.form-status');
    this.mode = 'login';
  }

  attachedCallback() {
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(new DisposableEvent(this.form, 'submit', (e) => {
      e.preventDefault();
      this.mode === 'login'
        ? this.emitter.emit('did-submit-login', this.getFormData())
        : this.emitter.emit('did-submit-signup', this.getFormData());
    }));

    this.subscriptions.add(new DisposableEvent(this.cancelBtn, 'click', (e) => {
      this.emitter.emit('did-cancel');
    }));

    this.subscriptions.add(new DisposableEvent(this.resetBtn, 'click', (e) => {
      this.emitter.emit('did-reset-password');
    }));

    this.subscriptions.add(new DisposableEvent(this.sendLinkBtn, 'click', (e) => {
      this.emitter.emit('did-reset-password');
    }));

    this.subscriptions.add(new DisposableEvent(this.loginBtn, 'click', (e) => {
      this.mode = 'login';
      this.classList.toggle('account-creation', false);
      this.loginBtn.classList.add('selected');
      this.signupBtn.classList.remove('selected');
    }));
    this.subscriptions.add(new DisposableEvent(this.signupBtn, 'click', (e) => {
      this.mode = 'signup';
      this.classList.toggle('account-creation', true);
      this.loginBtn.classList.remove('selected');
      this.signupBtn.classList.add('selected');
    }));

    this.emailInput.focus();
  }

  detachedCallback() {
    this.emitter.dispose();
    this.subscriptions.dispose();
  }

  onDidSubmitLogin(listener) {
    return this.emitter.on('did-submit-login', listener);
  }

  onDidSubmitSignup(listener) {
    return this.emitter.on('did-submit-signup', listener);
  }

  onDidCancel(listener) {
    return this.emitter.on('did-cancel', listener);
  }

  onDidResetPassword(listener) {
    return this.emitter.on('did-reset-password', listener);
  }

  onDidShowPasswordLessForm(listener) {
    return this.emitter.on('did-show-passwordless-form', listener);
  }

  cancel() {
    this.emitter.emit('did-cancel');
  }

  destroy() {
    this.remove();
  }

  hide() {
    this.hideStatus();
    this.classList.add('hidden');
  }

  show() {
    this.classList.remove('hidden');
    this.emailInput.focus();
    this.emailInput.setSelectionRange(0, this.emailInput.value.length);
  }

  setEmail(email) {
    this.emailInput.value = email;
  }

  showStatus(text) {
    this.status.textContent = text;
    this.status.classList.remove('text-danger');
    this.status.classList.remove('hidden');
  }

  hideStatus() {
    this.status.textContent = '';
    this.status.classList.remove('text-danger');
    this.status.classList.add('hidden');
  }

  showError(text) {
    this.status.textContent = text;
    this.status.classList.add('text-danger');
    this.status.classList.remove('hidden');
  }

  passwordLessForm() {
    this.classList.add('password-less');
    this.emitter.emit('did-show-passwordless-form');
  }

  hideError() {
    this.hideStatus();
  }

  getFormData() {
    return {
      email: this.email,
      password: this.password,
    };
  }

  get email() {
    return this.emailInput.value;
  }

  get password() {
    return this.passwordInput.value;
  }
}

module.exports = KiteLogin.initClass();
