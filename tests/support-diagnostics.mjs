import assert from "node:assert/strict";
import {buildSupportDiagnostic,supportSeverity} from "../assets/js/core/support-diagnostics.js";

const readiness={status:"attention",critical:0,warnings:1,checks:[{code:"data",label:"Carregamento dos dados",status:"warning",detail:"custos indisponível"}]};
const result=buildSupportDiagnostic({readiness,role:"admin",generatedAt:"2026-08-08T12:00:00.000Z"});
assert.equal(result.format,"distak-support-diagnostic");assert.equal(result.role,"admin");assert.equal(result.summary.status,"attention");assert.equal(result.checks[0].detail,undefined);assert.equal(result.privacy.containsPersonalData,false);assert.equal(result.privacy.containsFinancialData,false);assert.equal(result.privacy.containsCredentials,false);assert.equal(result.privacy.externalTelemetry,false);assert.equal(JSON.stringify(result).includes("custos indisponível"),false);
assert.equal(supportSeverity({security:true}),"P1");assert.equal(supportSeverity({blockedUsers:2}),"P1");assert.equal(supportSeverity({blockedUsers:1}),"P2");assert.equal(supportSeverity({degraded:true}),"P2");assert.equal(supportSeverity({}),"P3");
console.log("Suporte aprovado: diagnóstico local sem dados sensíveis, prioridades P1/P2/P3 e orientação segura validados.");
