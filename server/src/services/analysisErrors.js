// Only allowlisted metadata crosses the provider boundary; never persist provider messages.
function analysisDiagnostic(error) {
 const status = Number(error?.status || error?.statusCode || error?.error?.code);
 let code = 'analysis_failed';
 if (status === 429) code = 'quota_exceeded';
 else if ([401,403].includes(status)) code = 'provider_access_denied';
 else if ([500,502,503,504].includes(status)) code = 'provider_unavailable';
 else if (status === 400) code = 'provider_rejected_request';
 else if (['AbortError','TimeoutError'].includes(error?.name)) code = 'analysis_timeout';
 else if (['ECONNRESET','ENOTFOUND','ETIMEDOUT','ECONNREFUSED'].includes(error?.cause?.code || error?.code)) code = 'provider_network_error';
 else if (['analysis_timeout','provider_network_error','provider_unavailable','provider_access_denied','provider_rejected_request','quota_exceeded','invalid_analysis_json','invalid_analysis_structure','empty_analysis_response','analysis_blocked','analysis_truncated','missing_api_key'].includes(error?.code)) code = error.code;
 return {code, status: Number.isInteger(status) && status>=400 && status<=599 ? status : undefined};
}
module.exports = { analysisDiagnostic };
