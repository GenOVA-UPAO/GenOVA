# Escenario EJECUTABLE e2e para BU-002 (regresión): cambiar de cuenta debe
# actualizar la navegación (sección Administración del sidebar y acceso a
# rutas admin). La feature verbatim del bug describe internals de la era React
# y queda como documentación en tests/features/auth/.
Feature: BU-002 e2e — El cambio de cuenta actualiza la navegación

  @smoke
  Scenario: Pasar de admin a usuario retira el panel de administración
    Given que estoy autenticado como usuario con rol "administrador"
    When navego a "/dashboard"
    Then la página muestra el texto "Administracion"
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/dashboard"
    Then no debo ver el panel de administración
