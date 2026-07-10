import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'
import {
  isValidFullName,
  isValidPassword,
} from '../../../frontend/src/features/auth/lib/auth-validators'

// HU-001 unit coverage — importa las reglas reales de validación del registro
// (usadas por register-page); sin browser ni backend.

Given('el nombre completo {string}', function (name) {
  this.fullName = name
})

When('valido el nombre completo', function () {
  this.nameValid = isValidFullName(this.fullName)
})

Then('la validación de nombre es aceptada', function () {
  assert.equal(this.nameValid, true)
})

Then('la validación de nombre es rechazada', function () {
  assert.equal(this.nameValid, false)
})

Given('la contraseña {string}', function (password) {
  this.password = password
})

When('valido la contraseña', function () {
  this.passwordValid = isValidPassword(this.password)
})

Then('la validación de contraseña es aceptada', function () {
  assert.equal(this.passwordValid, true)
})

Then('la validación de contraseña es rechazada', function () {
  assert.equal(this.passwordValid, false)
})
