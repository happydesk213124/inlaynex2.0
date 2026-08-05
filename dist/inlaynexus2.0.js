//@name inlay-nexus-native
//@display-name Inlay Nexus 2.1.1
//@api 3.0
//@version 2.1.1
//@update-url https://raw.githubusercontent.com/happydesk213124/inlaynex2.0/main/dist/inlaynexus2.0.js
//@link https://github.com/happydesk213124/inlaynex2.0 GitHub
//@description Inlay Nexus LLM tagging + NovelAI overlay
//@arg inlay_enabled string true|false; blank uses true
//@arg inlay_capture_delay_ms string Quiet time before assistant capture; blank uses 1400
//@arg inlay_debug string true|false; blank uses false

/* Embedded Inlay Nexus prompt pack (opaque) */
globalThis.__INLAY_NATIVE_PROMPTS__ = {"__v":1,"__enc":"EkwNFA1FARcnGxxZFVBVT1JYDwQABAxIBBNTTE9BMEAPAh1VJ0wXFQYDF1R+CRIXDkAqXzUAOAAeDSErPVUQRREGTwAVB14RBgZLRBhFBk4oABdPAQoKAF5eBAsDCFAxQxcNChhFVlgEDwsEWV0cChUFB15eUiAYBARYBEEsJWhWezohIkEWTwQAGwFTQh4eFk1YB04YBA4KDR9fSRoEBFlLARcVFAcNEh4ADhtdA1AvDEtAF0MCCgMWFw0IABYWFl5cUgECUARfHxIGS0IDRRoHCARZZz0qNlsvQywcTE5QPUMAFBc3Q0cYSTwJBhBeGgAKEBcNExoOHxEXWRUTEEsFGFAEC0xKWUsHCRQQFw0RAh8IEQZMHgIGS8/2pUkKA0E3YjpFChBeQgUGHxgEVEEfDggYBCpfW0dMKBdOAQgIGRZZFVIMBREGTBMVBhleVhkHDwEEVkwCDBkGFl5QFxcEAwABUAATG0gXQwgADwRZaCM1LCxTz/DmTxkCEUwEQQIYDTh0PlVMBwxBAkUUGhxGA1IdCAEBRAIEB0JxGAJATiMRDUQBCxkZU0EfAApXUABfGQYEDl9bXAgaDwkcSU4AFgEBRBUBQ00AGFgDQQNIDlURBQxBGRdMB0sUF11ICAYdDBBUXRECCEtaHlQHThwTHF4LCwwpHRlZUiIIAwdMFwRDH0gORUkBAgIcDYzl7FUBTAdeTwMfVHYgQj5LQRdTDAIfPRdxAEZbVTRCER4zAzEXTgUTAh9IWhEaHgkCEEsHBlgDGl4FEwNNBBVKA09DO18TVwwcTBELSA0MCxBTaREcDQIfBlhQFQIMXlZeHwseQQ9MCRAdVRVEHB4KHwNacR49DUgOVmMMCQUSDUgcABxVW0wAAgoMAhVDEwRDLWQ6fSwqRT0XfwsQCxBTSAgTDBlQFEMRDAYLDQBQBRsJElcNKgpYOzx5UBsBGxUaWVAkDQxBH0IBTgIAFEgdRR4aAQ0CFwgEAwBIAgQHS2YZQwwPAkEaRQ8XC1tTaR9SISIkVEIFFRMeWVZRCB4cBBhfDwsbEBMDUDYATT47eVARFh8NAlkMA0wIFw0OCx0CLE4YEx0MEwBIAhIDRXEYbQdNT0EwQw0KFQUfSAQXT0UeFUAVQQwFQQ8RRk4JDAlZF0UZBQNIEQAOAxMRBCwPLj5+IhEOAUwIFw0OCx0CLE4YEx0MEwBIAhIDS1ofRQFOChQVQU4FGQUDSBEADgMTEU1cQQMKWQJYGwsMTVlNDwYbEABeHwAGCAMUA1AqBg5dVkUBC0wSGEALRRgbEkAVEk8eABFBHAgNDANWdQZOIi4tDR0OEQVTTxURDhgDEQ0RQRcZRBFWDBxMBAFEHRELWy9DLBxMTlA6SAdBAANMBFAKGgkTCg1GEBYeHUIHHE8iIlREHgIMBl0aVB0LRT0XawcJFFUyYTxSBgkVGlkZFRpLSx9UBQofQZut+kUMHRZUUBYdBAYRDR0AFwhFH18OTgAADUgcSyQbL0NdUg8DERlIEFtDCl5WWAdOAQQKXg8CHVVbRhUXH007G18VAA1LRBARIgEeBBhDR0tYJQFIFhcdTRYBQRxBDQpAEx81AEFBGV4bFxYUHkgQSE8LERlEHBhDBUwbVEkBAg0AFk4FJFcvDxBSBgtQGUIeDg0SQFhtB0NMAR5EGAAWKh1MHRcPV1AESAISDAVMGhEHDwEEWUIACQFOU0AfHAADCRkNkufxS1oeXgULTA8YQAtFEBABSFxSHBgCGkwdBEMLcVRtSw5CPRcATgULAAFDER8KMgYVXxkADR9eFhFGTgwGEFsLCycbEkAVLRkMAh1MHhUQCxdWdD8rPjhZZgEXHRQdDVtSKgMXGEQDCUwZQhtQBwcWBB0NHRUdGR9EHhVPRRkaThwUBw4NBkMAAw0TAA0ZDR0bU0MfHEIIHQRZCUhNS3gYRBoLCEEaQgMVFxsWQwRSjeviVE0rPANFcRgcSQ4NDRBMHQALFVMFBAAGChcRXwNIWUtLA10FTgIAFEgdRVNVEEEVEx1NHh1OGw8CBkgFEQYAABhXDScLGxkGSRVSJD9QXw01L0MNWBpdSQANDBwNGQ0dG1NPHwYHTRUMRAMVTUtjM2csPEwDGF8LRQsAAUMRHwpNERhCHgRNN0NWES4BAwVDDQ4+JFefivCY192c/ombzduGp84RhfbIityZg+vgnu2tLFBDMVInRBcIEAZYGFVJIR4REUgcBBYpUQEsUIPK8J6VwD1BNk1WHkksDQVDDQ4+JFeftdSZytmd+rWb/+M3DytRNQBMQTxVDwgIGRZeSlIzTzg1Y1ArKiV6OX41TEOM7LGCwvyZ6Z1QkOn/UBpMHQReC8DjrYXJ6I3jnQ5JWAYGXx4TAghNFMDl/QNHDRFYHwsCXBnByeGU78NNXFIZDAIdTB4VEEtlF19GJi0vWQZOLxEbBEIfXSUkPiNiP01DCkEfUBoLH0EQQw0JDREWDRYHAwFQEkICDBBQDRteBwECGBQNMkeV9u/B5uMzT1CWq+JBEB5fGFAEC1EBJQ8yRxhZU0oZBAoDTRTA8/2P/bwWHUkPAAgYXgsWWD4hBjU8QTEeWQ0QDhECSh9fCAIMW1lCHhERGh1MHFIrDB4WQh8TFktOHlAbQQ8OCVQcDB8dBw0EEwhNBxxIHkEMCVsfXhwdV0EcQR0AWBUvDyxQD0NQOkIEQQoFDRdBGQsNExhDDQBWKR0AUBIOHQARTAIADQhIFgtJBwgEF1kHEQFVPGM8K09FHhsNEw0MH0UTQkYECRYcQRwcVwIWTAAdAR5ZWg00JDcqZDp0LU6O4e0NHAAJABpfFRZPCxkRQRQSQwlIGl4eQDAPVA0OBAwBGl8VElVNExhCBAkGGA1dERkLHgwYQwsLDFUZSAcXAx8JVAUVABEZRBhWGkJMDxxOBQkZFhYBUBUDDAMHSANNQxxMAlIBQkwEGF8MEBwGXw0YEwYfUBtfHgAODkMCQkBAMA9UDQ4EGxYWXgMdHQQVB01KQRQOTAZeBx1AQRtMCRZUVRtIHBZPHQIbXQNNQyJpWV0IABUAC0lOChYZCg2S8vtNPjt5UAQCGV8fXw4dQwYVTB0WHQZdcR4nHAhQGUwEAgsOSVZdBhwJQVYNDQ0ZBxJOBBcdTRkaSx9BFANIGBEZHAkSHEMaSyQbL0NTUUxNHBYACA8CAgMaU0cLFBULTE4qPjM6bjkzI00gNW47QUsjZDF5LD04QSl/JyoqPCd0WS4BIh4YVFAVBhNZVlMMGhsEHENOBVtWU0ESXxcDER0DHANNDlUCQwhOjuHtDSEjPjwwZDE+Tz0xN2ZQSTA/bCRlQA5Mg/mLTgVQMD1pWRJPBANUWRgEQxtMFVpHTi0HDUgcRT07Nw1fUg82NTppUC4lS0EUHBEADQhXQQxLHQ0HXxEvD0FQFA5TQTEOSxNDDAAPBFlhARcdFxxCGxJPBANUQgIFCgVMBEhJAgMTHA1GCxkYGkMXXQwCHgBICBVDBEMaSEBAMA8pTA0OWBgSVFAbAQ4cAUkVQQAeXgJeBE4cExZAHhFYGRpDFQFPRlAUDlNBIANMBFAKGgkTWWQDBB8QU3kRFRwNUFsNEEJASA04UAQLDEFSDSoEFhccQgIHTxkREw0cCA0OXlhtB0NMLhtIF0UbAABZHx9PHQIbQAAVQwdEGFQaTkQWEFkGCg0BU08CFw4GGRpKUCswJGNWQxwCCRJQAzILVVU2TBMaTw1TVw5QLwIGSBYRBQcCBFkQTgIKGgZDFFIbHwUARVAHDBkNOHQ+QQUPGkIDFRQQB0hKUgwCAA0NEQ0OBF4CEQwYCRMADRgMCwASQVAGDgpQHUMEDkMKXQZUCBwNDxpIQQQMARpfFV0ODhMRXgMOEQJIBR81AEFBNWItLj0xU8/w5k8FER1fXwQaDl5ZUwYKFU4fTA0AWAESSgNSOSgiNmwkKC5FDSFDBgALQRFMBxdYFhxBHwBAARUaSgQJTBhZD10MThoSWV4LBgwcHENQT08EHgJMHAgHRXEYHEkhAQgNDQELFAxTTh8HARlfBVgRDQofVFlSCAMJExgNCAwUGRZfUFoPXBcdXxwBTAscFF4QDkMBCkICChhaE0ARARsIAgREFQIGCwIWUwwdGEEIWA8JEQEKTV8SDAIHFkIJQRADQgJRRozsx1ADTigZBVNeFQpPGR9UTxETBktNEVgbAgxOGU8BHBhaE1ofHw4DEFtNHQANCwMqX0ROPxEVRBpfWBccSQldCQwTEQIYAAoZDZS3+04NEQlIDxcZGxBIS1IMAR8ARRUSSAFIAVQFHBVOHkEPFgsQAAIHExsOGFTP9vNDClkCWBsLV0EbTAlKMTFcWhUTHwIeW0UfDQcCQxERi+j+QRhODQALBhxfGRccQywaAFAyBghZH14HTgQEGEkHCx9VNnUxMTshKVTP9vNDC0waWAgdCRIZA04rHQMWX1AdGQgCBkQUBEMbTBVaSQIDDhJeThIRARsNHwYHCAJUQR8TBktCBBEOGwkSCkQAAlYpHWQWUhkMFwFIUAANDw0YXkkeDQISDR0AGwEaQh5ITx0ZF0ZQEQ8KWAVYCwIJQRpCAAYKEAdIUAYOCgNYDR4OF0tIG0EdF0wHEEECAAoGXXEeLgFOU1cNIiQyPmQkdC1ODREJSA8XGRsQSFBaDAIdGUxdEgYbTARQHQsIQT1MAAcXGgFYWS4BKh8RXlAIDR9CVn8oJ0wCEUwcRRsUA1kZHQEeXlRvERMGS0oTXw0LHkGbrfpFNjonDRMdGgMEVFkRBhBFDTtYGh0FDx4NBgQRB1NOHx4AH1A7f1AJAgJfBUUQAglBRA0nKy40P2Q0XE8sHANMCRJDAkMVXRwKCUEORQsLWBwdWxUcGwQeEwIWCA8HRBhWSUYLFBxeHUUKEBJeHxwODxwNDRkHQx5DFV0MDx5IQ3EAVFZVIEgISE8NFx1fHAFMC08ZSAlORC88eys3WBVCShkAAw1fFBwSDhoLDR5UGwtMg/m5ThEQGgBIUBAKAR8aSlAIDUteHl4dTgwSEFkbBAwcHEMQWzMDQloNMQYGS0EZXgJUTAENSAsLGFoTVB8HAQpQFUkFDRcLAhZQDRsAFRkCDggZAQZfFRJPRVtUTgUEQwJLVlIFCw0TUHEAVlZVO0gZFQcZXxZYGQ0HUQ0WRQgCAAFWTR0NFwcHTV8SHwgEHVkVAUwLQANCChsAAAtNQQULGRpAEF2N7dYoQ0RPQyNMH0NJDQMNFl9OTSowIng5ICopWU4NFU8ERQ0WUwUPDwpZRQ8MChVfDRAQAwIeEEhQCQICXxYRi+74QQpZFwkdWBxDHAtPGhkARR8UF0tOGV0GHEwHFl8MDBwRFkMsHFpDUDxMGRNDB0gYVh0GRxINVAIAWF0haCEnJj81MARKQQZFSlgRCQIDDx4NBgQRBxMBUBIcBR8GWVAJAgJfFhFCTgwRFkMXERkcH01fEgIIAwdUUAkCAl8WHgkMDQ8eXg5KmvXVcR5EQU01DUhQAgwHQgQLSQtCBlcNDgcUABYNFQsKHhBYDRAJBh9IBF4KBh4OFEQPBSQbRANQNA4OFVteGwgNS1oeVAdOHgQVSBgEFgFTBRceDh4DEV5Qg+X5DRdFHQceBFUNAAoMVRJdABcOHxEaThVIPwUVWBE7Dw8EVl4eABscFl5QGwlNHhtZUAkWBkwYC0kOCQ0fTUJFGBYSWVAVBh8cFAFQg+PNcRhzCApWQQ9MCRAdVR9CHxkcTQcdWRgOFh8NFV4FAR5aWU4BCRcHU0wcHQEIUANEBAlDBUJWXQwACxURAh0RARkWAywcKAIfEBdQAQEEVFoREAEZDx4NDwENGQcBUAYOARxYDRwEAgUNG0QaDRkNGF9CRRoZEk4bUgcMGQYBUBILBF8CEQEPBRNVDQMACwYKDRgTBh9cVE8RDwQYAVZCAQ8eEVlPAhAdVRZUFQFDTRwdShgVQxhGH19FThgJEENOFhsUAQ0fHE8OGBFIGwE/BXEYEkpOPwkWWR05FlhTfhMXAQhQSQ0DCQIZSBIRCR4AABpIDktYJhtCBFJSTR8aSFAXChhYF11JAwMMHEMaRVAAAFgRHgMUUEXP8PJXQgMqX0RODBEYXw8CChQDRRBIT11dFkwDBAdLXh5eHU4DEx1IHEVQRV8cXECN7dZdDZLh90tDGUVJD0wVHFUaRRQUEUgcXDMDXVRNCT4TDl8VVAcaDFtZSwEJFBoEDQQaCk0DDV4EBA5LXRpQCgsBBBdZTggdBgBMFxdPGhgRQ1AREQ5eE18dQDAPVA0+Fx0TFl9QEQMCAxFfUAcRCkAfXw5AMA8lQ01GW1UDQRERCjEeFEQeFQYZRBlDCUEMBAFZCxcRGgFNUFlPAR8XTAQIDAUBVlwGAQhNWUEHAhABGkMXXk8ZGRlIXxYGClkeVBtCTAocVE4VChoDXl4uATEeVw5TQQAKQBNDCDICBwtCA0UZFxxbFV0NCBgdQxROEAJJEx1JDQMWG0IXRQsdHFlcUhodABFfUAMMD1RaEQ8bAA1ZTwEBAVlTThwdHAhdAV1cQRMEW1oRDBoPTyVDMgtbVlANAxsbGBEARB8PPwVNR1YAHAABVk1fBxcMEwIQQwgEAhgBUFABBFQWHgkdAw0WTUEFFgYVWhBSGAUVGg0VGRMHRBVYHUBMMhFCHBFYBhtMAhcLTREXWRkXCh9UVlgPThkSHEsbCVYpHXEeUUxOUBpMBBQRCkEqXy8BAA0WWk4REBBTXgkBGwgdVGMRFRYZTBoRCw8fBFlAAQEdVR5IAwEOChVUBT8nJUvP8KNJAQEIDQILCAgBChZQISciIiACNCQ3KmQ6dC1BPzQpfSIgNTA9eVCQ6f9QAEURFUMGQhJUQEBMJBdKAgwLHVNCHh4WVlA6YiRBJwpDFF4GHBlBDUwJFkNVPWIkUgYDBBsNEAILCl8XUh0LHhIicEAEGwEaQh4SQU0/GkEJQQ0KWQNDCAJBDRhDCRAZEhYNFhsKARRacR49DUgOVREKBg0TGE4aAAoGKHAsHEJNEBpMHQQDSwZWUQgNGAgWQw5FChACWBkACglQXF4ABAACSx9SSR4DEhwCGAAKFwAEXlIPCAgEXxUSEAJCGFFJHh4EH0gcFx0RXXEeX08NEQBZGRMGCwIWUAoNCRIKQhwMHQYTDT88IzRQA0UVD0MIRRdfDgsIQQ9eThcdEhpeBBcdCBRUTxESBksFBVkGGkwOD0gcFxERFhZQFgBNHhtZUBMGHF8fRQxOHxUWXwsBWBcSXhVbQTEeWQ0+DkMKXQZUCBwNDxpIQQQfEFxBERAKAVASQgJBEQ5KH0IdCx4EHQ1GAxEZH0gUW08OGBVfA08/BQBWYwwdHAQaWU4mMDQhbDMmKj9QN2wgQRASXgJUBE4BBApeDwIdVVtOGBMdXF5aThgAESUEWG0HQ0wBF1gKABhPU00sUAADLFZNXwEXGVgTUUkZBAQXDQAQHBBTWRgbHE0DHEIEQUsOQQVUSQEBCA0CDjlaGhVLLFAPRF4oQ11BAxxIF0EGAAxbWU0yRxcbLw8QXQ8ZAgFIEEEUA0gYEQgNDwQKXgEXERAAAAQTDU0HEUwADg0YAgZDBh4fQQpFARAUEVNMAAIKDAJUBRUNEA4NGVwAGkMBJQ8BAx4pUU1ZXDMDXVRNHgQEClkfRwwOTA4JWQcKFhQfAywcQk0nHEgeQSAeXxdFAAECQQlfCxYdAQANAwscGRUZDR0EEBhMEVRJHh4ECkgAEUJVIWghJyY/NTANEAIMBl0ZQgAaBQ4XcgcBGFVYDR8CGwQfGkwcQQMIQhtBBh0FFRBCADoOFAFEERwbDVBcSAgAAB8NGlQICEwIHV5HS1g6HkQEUhgFFRoNExQRClkfXgdOAwcfAzILVVUkRRUcTy4FBkwECAwFDQJGBkMfFRhKC0VQEx9MBFIIHx8BXQNIQwZIBUIICQlBCV8LFh0bBxdQAQoZUBROBRMCH0QZXzYJHg4MXR0FWAEcDRMaAB4VGg0XEwweXVZYDR1CQTZABxFYAhtIHlIACxZUQgJBExlIBVQdHUwMFkkLRQ0GFl5QEgwCHQRCAwgXAkIYbgAKDE8lQzILW1ZTfwUeCh4sGgBQJA0MQR9CAU4oABdPAQoKAFNZERUcTRYbX1ARDwpOEx4KDwEEC0xBFhEBBkwEGwADXxdFERMCCFkTQxpATC8WDQMADBQDRR8AHEFQGkJQKgwZSBdfSQcCEhBJC0UMFBQNAwYdBB4TXl49DUYNOV8MTiYyNmNOChofFk4EXE89AhFLFRNDBkwYSEkeHgQaRB0AWAESSgNSABsVBg0WBBRLQRdLEE4DDxxeQDkWV18PFh0dABEAD0pDQEgNOUQdHhkVWWsBFxUUB3EeLgE/FQBYAg9DGUwBESM9Iy9ZQgAJAVtTaR8HDQEVWVwFDhcOSVZaDBcfTg9MAhAdBl0NPh1PGQIVRBwIDQwNFV4EAw0SVw0gClgYEl8bFgAaHlRLFQ8ADl5YbQcyAgEZTQQWFxsvQwsuAU1QKA8eBBQ0Th5QGw8PFRxfHTlaT1N2LBxPTVBUViwPQ0sNVhFJMk4PGEALOVpPU3FSARsfGRpKLENPN0NWEUlOTEElDx0QChsSQBUuTVdQKA8DFRECQxFtS0IwD1kNTkVYVS8PFxsZCB4rQxEMBjcPTBE1TB8VC0QAAiRXX3EeUk9NUFQNLEMQHl8YUAQLMxcYXwcEFgEAcVJITzYsVl4EEwoFSioTNEIwD1kNTkVYVS8PFxsZCB4rQxEMBjRbF0MADwIVCnFMX1guLw8DBh0EHhNxUjxPN0NWEUlOTEElDw8JERQASAMuTVdQL3FSEhcZRBhWNUwxTSVDTkVYVVMNLFAAHxkTRB4ADzcPTBE1TB8VC0QAAiRXX3EeUk9NUFQNLEMCG10TUBsPAgIccUxfWClRXgQABgMXKA9cPQ1LDVYRSU4wQxhZGgwKEC8PSlIzTwMAXxkPBDcPWm0HTkxBWQ1OOVoUEE4VARwCAh1IAz1BUQ0qExoaHggXSjJHJBtTDVBSEjEeVA0tTT8FDVZtSx0PBBdIHTlaT1N2LBxPTVBUViwPQ0sNVhFJMk4RFUwNACRXSQ0sUBwZAh1DFz1BR3EYEUlOTEFZcUwWEBoHXixQVU0rKENQQUNLDVYRSRUwD1kNTkVYVVMNUFIzTwAVXxEGEQpdHm1LVExRVXEARVhVUw1QUk9NUCgPCT4TDl8VVAcaMENDDVtVVCkdDVBST01QVA1QQT9JThdcDBwNPVsXTjlaBgdfGRwIMVJYcR5BQ0sNVhFJTkxBJQ8dDAwAElkZHQExUk4NLEMQH18fXw4yTk0lQ05FWFVTDVBST00sVkMRFRYZTBptS1RMPVteGhcRGxRxUl4zA1BUDVBBQ0sNVhE1TA8OFF0BFhEBGkIeLQYJLFYXUD1BGFkEWAcJMENVcQBFWFVTDVBST01QKA8TDg4bQgVYHQcDDyZbDxcRFB1ZLFBVTSxWXgQTCgVKKhNFMgJBWQ1ORVhVUw1QLk0OBQZMBAgMBXIRQwYbHBIlD1RFIylRXgQABgMXKA8tTT8FDVYRSU5MQVkNTjlaFhtMAhMMGRUGXixDWUt2Kl9JTkxBWQ1ORVhVUw0LLgFNUFQNUEFDSw1WEUlOTD1bQw8IHSlRF1AuTR4EBkQeBj9JASpfSU5MQVkNTkVYVVMNUFIzTxEXWRkODTcPTBE1TB8VC0QAAiRXX3EeUk9NUFQNUEFDSw1WEUkyTgQBXRwACwYaQh4uTVdQKA8DFRECQxFtS0IwD1kNTkVYVVMNUFJPTVBUcVIAFx9EBFQ1TFZBJQ8dEQocHUosUEMxHlQNUEFDSw1WEUlOTEFZcUwEGxYWXgMdHQQVB3FSW0M3DwVFGwcCBiUPQjkWVVMNUFJPTVBUDVBBQ0txVF8cCgk9WxdOOVoaHVEfFAkxUlhxHkFDSw1WEUlOTEFZDU5FJFcESBECAAMsVhdQPUEEQwpeDwgwQ1VxAEVYVVMNUFJPTVBUDVBBP0lDE1YIGgUXHHFMX1gpUV4EAAYDFygPLA9DSw1WEUlOTEFZDU4YJBtTDVBST01QVA1QPD8FDVYRSU5MQVlQMgtYVVMNUFIyMR5UDVBBHjdDVhE0MgIcJUMOBRgpHXEeEgEIBytOGAARCk4CVBsdDEEQXk4FIygTDR8cAxRQA0UVD0MOWxNDEE4aCApEDAkdVRBFEQAODgQRX1AADxlIF1UQTgQACg0IDBQZFklQEx8dFRVfEQ8ADgNWdBEaHgBZThsXGQEaQh5SCQQVGEkDQQwFQQ8RHgYJD1lMTggZARBFGRwITTMBXxEVCgRDVkIQHRgEFA0DAAsGEkoVUg4eGwcNFg4RS1keVARAMA9bAUwECAUWTAITAQ4VK0QeCwYIWVQLS01PQTpFDxcZFgdIAgFPBB5UWRgIEEtAE0IaDwsEJUMyCzcbH1RQAgoCABhIUAUGH0gVRQwKTAgXDRoNEQZTQBUBHAwXEQ1YFgofRVZDBh0YBAsNAgoXHgANBxoKA1ASRBwNBg8EWG0HIgUPHF5URRgbEkAVUo3r4FRMABEGCl8XXwoLUYP5i04ZWBQHWRkAClCS9ItQHUMKThVUGh0DExBIHVia9dVNLBwrAlA6YiRBEQ4AGUQdHhkVWUEBChMGU0ICUh8YBFRLGQ0PDklWXwgDCRJZRABFGBsWWi8RBwwCFU4EBBEYTVgRPB0JQQ1FCxYdVRZVEREbTR4VQBUSQwJDVkIBARhBGU4GBAoUEFkVABw2LVpDEQwGCwMqXyYDBRVZXgYKDFUSWQQbHQhfFU4TBBAYQgRYDB1MFhFIAEUNGxBFERwICBRUWwNBAQpeEwpJHQkVWUIACQFVBEUVHE8ZGB1eUBILBFlWVQAICgQLXk5NHxAdSAITGwQfGgAfDw8SDRlHDBweCB1IR0skGxNDBRYKVyxWQh49QQsNWREJGQkACUIAXyRXHEMsUA9NBxxIHkENDkgSVA1VTA4NRQsXDxwASFAdCQteVGQWQQJLTh5QGw8PFRxfSRZYAhZMAl0YCBEEQh5BDwROHREAHUwOFw1GAR0TElgcBkZBUAdFHxVDClkCWBsLQwAaTgsWCxoBRBUBTwwCEQ0ZBg0EXxNVRzICPRdWCgAMEBBZFRYwDxwbThscPwVxGBJKTiUPGkIDFRQQB0hQGwFNBBxEA0EODl4FUA4LTEkcQB4RAVUSXQAXDh8RGk4VSD8FcRhKAAAPDhRdAgAMECxPHB0MBg0oQywPLQRZVkMMCQUSDUgcABxVFUICUgMCHx9eUIPj/w07ZDo6TAAdSU4AGRYbDQQdTw0eEVovAgsKXxdSHQseEhkNGQwMHVNLBR4DTREEXRUAEQpDFVRJRUwADVkHFx1VWA0REQwIAwdCAggGGANWegwLHEEXTAMAWAYDSBweBgMXWnEeKAVLTxlFAU4ODRZOBRZYFAFIUBcCHQQNAh4ODQ4BVlQfCx4YWVsHFhEXH0hQAgofAxtDUAYMDl5WWAdODA8cWjEGEBQBTBMGCh8DFAMsD0FHDxpeGwszCBdHCwYMV0kPU1FPIBEAThgEB0thGUMMDAMOEnEAORYhAUQXFQofXRlMBAILDklWVAcaHggcXk4KFhkKDVgcABlQAEUVQQUeQRoRBQEeBBtCAQ5RWy9DLBw/DAkYQhEFQwZMDxEBDxoEQ3EAVFZVEw5TUgMPXQxDEQhNB09YVBEaHgBZz+7xWDo1azkxJiw8VH0xIihLBSVlKDw4SBkNjOXeVRMFNTwrRBBUz/D1QwRLEFgKBw0NWV0PBhNVHEMcCzMDQloNEEJAS38TVwwcCQ8aSE4pFwcWTx8dBE1YAF8ZBgQOX1tcCBoPCRxJTgoWGQoEEFKN7eRUTBYVBhkNBlAKBUwkN2kyCyQbNUIcHgAaUABMFwYKBUpWQxwCCRJZSwEXWBkRAAgcDgRQAl5QEwYNSARUBw0JQRVCHABYXRpDUAYHCFAZTBkPQx9MEVYMHEwRC0IDFQxcXQ00HU8DHwANAgROBFgCQRwaTAAJXQsEChQdThVSCQICVE4YABEKTgJUGx1MFhBZBkUeHB9BFRZPDAAESBETAgVOEx81AE5NW04GBAoqGkMaFwwZUk4PU0JDKEUXQwgNGAQLDUFFKBABXh8cDk05GksfPRE3QyNCDE4YCRwNCAoUGRxaGRwITRMcTAIAAB9IBBEIAAhBDF4LF1gFFl8DHQEMUBBIAwIRAl0CWAYAH0EORQsLWAESShcbAQpQFV0ABAIZTBhSDB1CPQtxAEdUVwNfFQIdAhMRXgNDWUkOVRE6DQkPHA06BB8SGkMXLh0xHjVDEQ0aEUhWRQELTBELQhgMHBAXDR4THR8RAEQGBEMfSA5FSUYbCRBOBkURBlNJGQQGCRUQDRkPFwQNGEQEDAkTHElOFRkHEkoCEx8FA10NEQ8HS0gORRsPDxVZWQYAWB4WVFAEBh4FFUFQBA8OQBNfHR1MBxZfTgQWVRpAERUKTRcRQxUTAh9EGV9JHgURHEEHCx1bL18sHDMfLBp/JS0mOBcqQzUAXU9ZawcXCwFfDRkWCgMEHUsJQQIHQVZSAQ8eABpZCxcLVQNfFQEKAwRURB5BFwNIVkUMFhhBGEMKRR0NB18RERtNBBxIGRNDCFgEQwwAGEEJRRcWERYSQVATHx0VFV8RDwAODRdfDU4NFQ1EHABWVTxYBAIaGVAVDQMIDQxBExEFBwIEWUwaRQwdFg0EHR9NFhtfHQAXH0gSESw2LSItYTdFFBwYSFAGBwQDTnECPQ0wbAZBDA8eABdOC19YFhtMAhMMGRUGDR4ADg4cTBEIHhwEGF8PCxsQU1kRFRxBUBdFERMCCFkTQ0kADQwcH1RFGQUDSBEADgMTEQ0EAAQYcCpDNQBELxZZC19YPBUNBBoKTQQRVQRBCgZdGlgMHUwAWU4GBAoUEFkVAE8EA1RDEQoGDwFWVBEeAAgaRBoJAVUaQxMeGgkVVHFSAgwGXRpUHQsAGFlDGwEdKVENGRxPGRgRRAJBFwpKBRhHMh49F3EcORZHXQ0jFwwCHhABUBIWBkAXQwAUCUENRQtFDhwAWBEeTwgGEUMEEkMES1ZFAQtMERhfDwIKFANFA1xPKx8GQBEVQw5MFVlJHQkNHE4aABxVA0wCEwgfEQRFUAQbCk4CXRBOAAgSSE4REBwAFywAMwMrJA4tW0MnQhVQHQcDD1Z+CxEMHB1KUAYOCgNYDTMADg5fFxEIAAsNHAFOJhAUAUwTBgofUBVOBAgMBV5WUAcKTAQBXRwACwYaQh4BQTECKEMsEz8FHlgRLgsCBAtMGgBYDghKFQYIAR8WTBwXAhkXTEUGCQsNHHItBAoRXWQdEwgIXjlEHhweia3lShIJCRUeQQEHGRkFTAJIVRkfE0ocBDwoTARVRycBAB5IQCgZDQ5QUAEHAgQHDQQOFwpBWBE6CwAEGllOERAQU10RAA4KAhVdGBJDH0UXRUkNAw8NTAcLWAEbSFAfAB4EVF4ZBg0CSx9SCAAYQQ9EHRAZGVNOGBMBChUHDR8TQwpOAlgGAB9PJV8yCyQHL0NEXE84AxENEw4NCEQFVEVODw4UQA9ICxADTAITGwgUVFkRBhBLRBhCHQsNBVlCCEUeAB9BUAEKAwQRQxMEEEVxBG0HW0JBNlgaFQ0BU2wyISAhJSBoPDhDJWIieSAgK0E8YT0gWBcWXhkWCh5QAEUVQTgqXQZUCBwNDxpIVEVWW11wUB4GAxVUTB4FQx9FExEyPk88Qw0CDBYQAANQNgBNHhtZUAAHDw0bUBsFCA4OQ04HFBoQRgNeTwoCEUgECA0MXloRBhxMBAFdAgQWFAdEHxwcQywGcR49ETdDM2koIzwtPA0hMCwlJnlKLh0xHi9sABEGCl8XXwoLVkE4QQcGHU9TQR8cCE0SGEIeBQZLRRdYG0JMAxVYC0UdDBZeXFIYCBEGRB4GQwoNAl4bAEwTHElOAQoQAF5cUi0CEk4NBAAPBwFWXBwdDxQVTBxJWBcBQgccTwURHV9cQRQOTARYBwlMAFlPAgQbHlNeBRsbMCwGcR46M1pwTBEoTggIFEEXRRQcBw0dFwsEFQJMHEEXClsTQwdCTBYQSQtFCx0cWVxSLgEZF0hQEgofWR9fDk4NFVlMThIXGhdIHlIbDBIYSFANDARGH18OThwEF14HEx1bL18sHDQ9QykXUCIPBF4THBweQEE7QgxFFxMVSAIbAQpQFQ0XDQwcRBhWSR4DFRBCAEUMGlNsHBsMCFxUSQIADgpZH1JJAgUGEVkHCx9ZU0QeBgoDAxENERUOBF4GWQwcCU9bAUwVChAVRBweTVdSSF4JEhcOQEhtGzICNRFIThYBBgdIHVIHDANUSRUVBghZE1VJHgMVHEMaDBkZH1RQPDwrJ1ROHw8XDkMCQkkZBRURRABFDB0WDQAAAAAAAANQOAweDRtEGhpMAApGTgMXB1NeBQIKHwYdXh8TQwpdBkMGGA0NWU8LAxcHFg0AAAAOFRFJGQ8ERXEEbQdSQxIAXhoAFUsvXywcUwwDB0QDFQIFWUhtGzICXQ1FARAfHQdeTi4dMR42SBYOEQ4NPxEZHAMCHEgKRQ8cB0VQHg4PFRhEHgZPS2RWXwwLCEENQk4KGgESRB5SHBgAEV8GCBAEX1ZQGR4eDg9MAkUcABYNBB1PGRgRDQAOFw5DAlgIAgAYWVgAFhkTFg0THQEZFRpZXj0RN0NKHh0GAxQeRRoWRikBcR5OGwIfGHITAA8HDR9VVDJOIDodKFI8RzYANTRbWF1AaUEiTlNuRXVEVypXPR4sXTtDNh4xLk1TLAZxHkFDV1kZXgUxAgAUSFAXHQQGSAMGMB4FBEgCFwoYQgRuCB4cExZbDwlEWgdCHx4wAxEZSE49ETdDVhFVHg0TGEALER0HABMsADMDUFQNUF0TCl8XXAwaCRNHcRw5FlVTDVBST1EeFUAVXxEOTAVeB1JDDxhAC1skBy9DUFJPTVBUEQYADx5ISGUBC0wRC0IDFQxVEEIeBg4EHgcNAA4XDkMCWAgCABhZYz0jL1UQQh4GCgMEBwNMThUKQQNUVzIePRcNTkVYSVxdEQAOABUASAJfPxlxGBFJUkMRGF8PCB0BFl8DTDMfLBoRXxUMBEEpUggCAF8lXzILRFoSXgMbHBkRGllOPRE3Q0pCEB0YBBQTMhckG09ZHx0DMgIRXgAODRhIVlgNUzBDOG5eI08xQWhdNylZRVkZNFAgRhU1Ai1DVSdPaV0nQDZFaEMzM09OKF8sD0NLEQBQBRsJXwJxTBcdBgNCHgEKMVJOcVIgMzt/OWcsKjBDVXFMFx0UAEIeLk1XLFZ/NTI3OWQ1ZSAhIjImYScjLDA3cjY9PTI8NW81LSolaioTFFJDFxhBGwBGKQFxHk5AGR8bQS8TBhhdGV8aC1I9C3EAWVcGCl4EFwJTLAZxHl0CGF4fQh0PAhVHcRw5FkkHRR8HCAUEBxMsEz8FeR5USR0ZERxfGAwLGgENGBMcTREEXQIOFQ5JVkUBC0wNGE8LCREbFA0fFE8ZGBENAA4XDkMCWAgCABhZYz0jL1UQQh4GCgMEWg05QRADQgNdDU4cExZOCwAcVQREBBpPGRgRDRwAAQ5BH18OTgsID0gARQwdFg0DAgoOGRVBUAIKGU4DXBoaDQ8aSB1LJAcvQ0xdGwUfAUoYFRBVcQRtBydMABQNCBAUGQoNGR8CCAIHSBRPQydIAhYaTg4EHkQARQwdFg0ABxsdBQADLBM/BRFZUBodBRINTAARRldfDwAACh4VAHJBQ1lJdiZeGgcYCA9IMzkKKR0BUAsKDAJUH0BTV0cND1QIHExTSR9bSVgRFlkRGwMIFFReGAAHAkMRHUkMCRINDR8QGRkaWQleTwwdFVcZDwRLXANQBQcYGFUNAgobFAdEHxxDTQYRXwlBAg5eAlkMGgUCVQ0DBAsBFl8AGwoOFVgNHg5DH0gORUVOTAMcXhpFERkfWAMGHQwEHUIeTUNGHEwLCgsCEhZfCwFCTy9fLBwzHywadj4EBApZH0cMMzATJUMaAAABXw0cHQgCXFRaERUGGUAXQwJCTBUWQk4IGRsKDQcTGwgCGUwCChBHDRRdCAAHQQlMCQBUVQdICAZCAh4YVFARAgxIWhEbCwoEC0gABh1ZU1gDFx0DERlIXEEQAkoYUB0bHgRVDQ8XDBwAWVARAAEcFU8fEwIfRBlfRU4aAAtEDwsMVQBIBF5PAREGShVBFQpfH1AHGkwSHFlCRUweHEARXk9fGxtAEU1DH0IZX0lGHxUAQQtMVFUcSBsTBARcVE4YCAECAVZFHBwCAAtCGwscWVNLGR4CTRcGTBkPT0tAGV8GDQQTFkALSVgRGlkYFx0EHhMBUAkCB0sCXgcLQEEKThwAHRsHQh4XHEFQEEwEBAdHDRldDUJMUEAUXhZYXQBZCR4KRFxUQAUVAh9EGV9FTggEH0IcCB0RXw0UGxwZHwZZFQVPS0kfQg8HCxQLSApJWBQBWRkBGwQTVEgCEwwZAVZVAB0YDgtZCwFYFB1MBB0CFFxUTB4AFwRAH1IIAkwSDV8bBgwAAUhQFx0fHwYBUAAQEkAbVB0cBQIYQU4DGRYWAVAHAQMRAFgCAA9LRRdYG0JMAxhJTgABEAABUBEDAgUQVFAEGg5eWhELAg0PEg0LHB0GXw0AHQYDBA0NFQARGAFWUwgKTBELQh4KCgEaQh4BQ00SFUlQDQoGT1oRCw8IQRFMAAELWVNICAYdDFAcTB4FEEcNFFANTgQAF0lOFgwHBk4EBx0IXFRICBURCg0SWA4HGBJVDQgADxABDRQbCAQEBwFQAwIPDRpUDh1AQRxVGhcZVR9IFwFDTREZXQUVBg4BVlUAHRgOC1kLAVgWHEAAHRwEBB1CHk1DCUwSERkLHhIJSA0REQMWAVAfGgEEHV0cBEMdRBNGGkJMDxxKDxERAxYNAwIODhVYDREPCgZMAlgGAEwEC18BF1RVEEUCHQIMBB1OUAABDl8EUB0HAw9VDQoMCxoBShEcBhcVEA0TDg8EXwUdSR0PABcNDxcMHBVMEwYcQVAeXRUGQwpfAlgPDw8VCgFOEx0HB0QTEwNNHB1DFRJPS1sTQx0HDwAVDQwEFhEaQxdeTxofBl4EQRIeTBpYHRdAQRtMCkUJABJBGQYWQVAYQgcTBhgBVlMFGx4TAAFOEAgGEEwcFwtBUBJIBwQRS0kTRQgHABJVDRsLHhwdRAMaCglcVEQeAgwGXRpUHQtAQRhADxEdAAEBUBEHCBUHVFxBFgVeF0UAHQoAGlkBFwFZU0QeEwsIAQFMBARPS0kTVwANBQQXWUJFCwARXREAQ00AG0ICTUMPRAVBBQsNEhBDCUlYAxZfCVILBAMEQRUAEAJDER1JDA0FWUQCCQ0GB18RBgYCHlgNEgAHS10ZQx0cDQgNAU4HERJTRRUTC0FQE0EREhAOXlQdSw8ZFRZZDwJaT1EOUDEHDAIVTgQEEUthGV4CTi0UDUIaBB9VW3sZAQYCHl1xHj0NMkIDERsLDwQQWwtFNzs2DRMaDh8RF1kVE0MZSBBUGwsCAhwNBwgZEhYDUCYOClAARRVBFQJeH1MFC0wRHF8dChZVFUICUiECBhFBMShDRA0yUAcMAw4LWEMWDAwfSFA3AQocHV4YQRMZQhtBHR1CPRdxAEZbVTxYBAIaGSwafxUVFhlDVn4nK0wrKmIgRRcXGUgTBk8CHhhUXkEtBA0bUBsFCA4OQ04DHRsQSANeTwMfVE4fDA4OQwJQGxdCPRdxAAUYFRleHxwzAwsoQ1BBP0lKE18NCx49WxdOOVoSGl8cLk1BLBoNUD1BCl0GVAgcDQ8aSDJHQlUvDxkWCgMEHVkJQUxLTxlVEE5DQRFMBxdYWlNICRccTV9USxECBksCVkICBwJBm636RTY6Jw0THgAZGBFeLENPN0NWETVMDRUNRBwAJFdJDSxQDAEfAEUZDwRLAlZeHBoKCA0NQUULHRxIA1JETQARXx0ADQ5DAhEDCxsEFV8XRVAQEl8CGwEKA1gNHgQAAEEXUgxCTAYVTB0WHQZfDQcTGw4YWA0VABEJWBJCi+7KSCUPQjkWVVNxUhMMDhUHXh8TCg5eKhNTTjBDDkgPFRcbAAFQEA4KA1gNGAQPDw0GQwYeH01ZZCpFHxASX1AdAQEJVM/w9UMlYiIRAwsbBBVfFzlaKR1QLBwPDRAoQywPQEgNMVQHCgkTWQU8ICkgOn81NkYxHhRKFQ8HDl8WEQQbHxVZTwtFHQ0STgQeFk0QKA8XCBEHcVRRSQEeQRlxTAcXDC8PEFIJHx8ZDQYIEB5MGhEMGAUFHEMNAFgaHUEJXDMDNBsNPi43S0QYVwwcTAYcQwoAClUVXx8fTwMRGUgDTUMNRBpUBw8BBAoBTgoKVR9CAhdBTTkSDQUPAAdIF0NFThwTHEsLF1gBG0hQARsfHxpKFRNDHUQFRAgCTAIMSFVFCwEaQRxSHQgEAV8eQQwFSFZeD04YCRwNGhIXWy9DMhdPCAgAXxUMBgdUVkUBAR4ODEoGS1gjEkoFF08ZERNeUAARDg0XEQ8PBQ0MXwtLWDEWXhMABg8VVFoYABdLVBlESQ8PFQxMAgkBVQBIFVIOHlAdS1ATBghCGEIdHBkCDUQAAlgBG0hQHgACG1QcSlBNN0MqX0pNT0ExTAcXWF0wfzkmJi4xOA2S4fdLXQNFSQcCQRhdHgAZBxJDExdGMR43TAAVFhlIVkUBC0wJGEQcFgwMH0hQEwMAHwdZUAQbCk4CXRBATCUWDSAqLFUAWR8CTwwEVHFSDQwFSlZZCAcePVsNQUUkVxFMHhUcMVJacR4oDQhBA1UMTg0SWUAPCwFVHEtQBgcIAxENERJDHUQFWAsCCVslQ0NFNBAdSgQaT0tQAkIcFA4OF1ZCAQEeFVkCTggdERpYHVJATRwbQxdBTEtbE0MQTgAOF0pCRQwdGk4bXk8ZGB1DXEEFB1gQVxBCTBINXw8MHx0HAVAFDhsJWA0TFBEHVFoRBAsfEgABThYUEBZGLBxCTTMbQR8TWUtIDlAKGkwCFkEBF1AGWgFQAAACBAcBUBUKG15aEQ4cDQUQSAARVFUAWQIXDgZcVEUZBgsHRBFZHR1AQRRYAhERFhxBHwAKCVAHSBMVCgRDBW0HQ0wiDFlOSlgGB1QcF1VNEhtPXEEXHEQYER0PBQ0KAU4VFxsKWREbA01YHEQXCUwHQgEYRU4OFBcBTgcKFBpJWAFGQVAHRBQEQwlfF1gNQkwJGEEISA0FXw0YGwIIUBdYBE1DHEIaV0kNGRVVDRsLHBABTgUGQ00VAE5ePQ1GDTRQBwkfQVYNCBcRGxRIUDYqOTE9YUpBAQpDEUJJHQQACUhOTQsBAUwZFQcZUBZMHgYQRw0UXRwAGEEbTAACC1lTXhkWCgEfF0YDTUMIWARFCAcCQRtMAAILWVNeBxcfGVAWTB4GEEcNF0IQAwEEDV8HBhkZU08RHAgeXFROGA4TG1RWUwgACxJVDRkMCwUKDRITAQoDXQFQCQwcDR5YDgZDDRZaThEQEAoNAxsbTR8aDQQJBktLGUMMBgkAHQFOEhAQB0UVAE8ZGBFUUAIMHUgEEQwXCQMLQhkWWFpTSAkXHEFQBEwCFQYPDQVYDQtAQRpIABEdB1NdEQAbMR5ZDTgAChlBH18MTkpBH0IcABAQEklKUgoVABteFQVDDUIEVAELDQVVDRkMHBoECgNSHwgRHwFQCQICX1ZeHwseQRZDC0UdDBZxHl9PPhkQSFBOQwlMFVpJQUwCC0IZC0JVAEQUFwMCEx9eUA0GBUoCWUVODQkWSgtJWBQdWRUcAQxQHEwZE09LRRdYG04KDRhdHUlYHRJEAlINCAQDSBUPQw5UE0JFTgIACUhOCR0bFFkYXk8BHxteFUEQH18XXw0dMA9UDS8GGxAAXh8ABggDVFkYABdLTARUSQYNCAsAAQsUDFNeBBMWTRkaDRECAA5eBV4bBwkSWQUGBBEHU18ZEA0CHlgNGAAKGV0fX0VOHwILWAAGEBwWBFCQ7/lQAEUVQQsKRAQRABofBBVLThYMFApeUBsBTREEXRUAEQpDFVQ1ADAPWg5NRT4UEEhQXU8PHxBUUEkCG10TUBsPAgIcBDILPQwWXlBaDAIcG19cQRADTAZURU4JGBxBDxYQEAABUBEOGRMcQRkGCx9eXx1JCxUEG18BEgtZU0sCFwwGHBFeXEEOBEETHUkDDQocWB5JWBALXQIXHB4ZG0NdDwYeWQRQBU4FBRxDGgwMDFNZAhMGGQNYDQMKCgUNAl4HC0BBGEoLRQ4cEUhcUg0CFA0NBBgTDgFWUxwdGEEQS04GFBASXxwLTxsZB0QSDQZFDTheSQ0ADg1FCxZWKR1xHlFMTlA1WQQIEQ4NXlIFARgJHF5OTlgFFl8dEwEIHgANGgQUDkEESEmM7PVZbjwsLDwwbDxSCwgEFUQcSD8FYR9CHU4LAAtACwsMBlNdGRcMCFAWVFARCg5OEx9JKAMTWUgPBhBVBUQDGw0BFVREBAQOS0QYUgUbCARDcQBIWBISXx0XARlQAFQABENADRVeBQEeQVINHgQMARZfHl0fHxkaWVBKQwZMAlQbBw0NWUQIRRcXBUQfBxxNWB9DGRVPS0kTXwADQEEVSA8REBABAVABBgEbWA0cAAAOBCpfRE4KCA0NQUUUEB1KBBpPQlAHQRUEFQ4NXlIbARxNWUIYAAoGGlcVFkNNAxhIFRcGB0gFQkVOAA4XSk4WFBAWWxUBQ00CG0EcBAdGWAYYNQBBQRpCAgkZB1MCUBwKDhsYRB4EQ0QNFEQdGgMPCg1BRQIcA10VAE9CUARCEwoGH15WHkkdAAgNXk5KWBkSVBUABgMXVEICBQYZcRgcSRoDEVUNARAMEAFaFRMdQVAdQx4EEUtBF0gMHEBBG0IaERcYAAFQAQAOGwcCBAgEA1kFHUkdBA4cXk4WHQUSXxEGCgEJKEMxDRAEDR9fCgIZBRwNHgAKGBJDFRwbTRMcTAIAAB9IBBEDCxsEFV8XRVdVBEICHE8KFRVfUAgNS3k+eDpOCggcQQpfWBASXwIbAQoDWA0eBAAAQRdSDEJMAhFCBQAKWVNKHBMcHhUHAhYTAgZIVlIGAgMTVQ0ZBAwWGwFQAAYDFwcBUAkGCkkGWQYACRJWSA8XGgAXXlBaGAUZF0VQBAIZBFoRAQ8FE1lCHAsZGBZDBAFBMR4wQlAvLD8NBUQEAw0TEFcLRRkGU0cFARtNLFZOERIWCkFWUgUBGAkcXjJHWBoBDSxQHA4YG0IcQRYFRBBeGwMwQ1lMAgoWEFPP8OZPCAgETB4FQx9FExEcAAUHFl8DRREbB0JQGxseUARMAhUQSwUUXQgUCRNVDRwMGhccQ1xSHwEVFVkVBUMYRh9DHUJMDRZMCAAKBl8NFQYMQ1lacR49DUgOVREoDQ8ECl4BFxEQAA1NUhgIEQRCHhJDRA0ZRQELHkEJXwEVC1UcQxwLT0UzJmQkKCAqYVZVDBoNCBUEMgs6FBReXFIYCBEEQh4ST0tdHl4HC0BBGkEHFRoaEl8UXk8FFRhJUAgXDkAFHUkMDQUeSB1KFBQdVBEACx5cVGQ0QQAKXxJCSYzs9VleDQAWEF5CAl8HCBwQDQATDBteWhEnIThBCUgcCBkbFkMEUgoMAgZEHgYQREoaUBodCRJXcQA2EREWDREcC00TG1geFUMGTAJFDBxMFhFIAEUOHABEEh4KQywacR5CQEt/A10MHTAPVA0rCx8ZGl4YUisMHhZCHxMWRkEfWgxOGAAeXkJFGxoeQBFfHAgAFV8RFQYPDR9fGgcIBFlIDwYQVQBZAhsBCl4oQ11BMxlIEFQbTh8RHE4HAxEWU1sZAQYPHBENFAQXCkQaQkkBGgQLDR0NFwcHDQYTCBgVVFofEwcYA1Z1DAAfCA1UTgoOEAENEgAKGxkAVF49DUYNMl5JICM1WUQAEx0bBw0eEwIIA1gNHA4RDgFWXhtOGQ8KSAsLWBcSThtSCwgEFUQcEk1LYhhdEE4YAB4NGQ0ZAVNEA1IZBAMdTxwEQ0NCBBEaGh4OF0oCHFgcHl0cGwoJUBZUUBULDg0FWAUGAxQcWRoAUVsvQ11SKwJQOmIkQRMeWVZSBQEYCRxeTgwWARwNEQIfCBEGTB4CBkcNGUNJBwgEF1kHEQFaG0wZAE8EHgBCUAAXH0QEVEcyAkxZZwsSHRkBVF8VAwwDB0gDTgYKXxREDR1MBhYNBwtYFAdZGQAKTQcdWRhBAAdCAlkMHUJBLkgPFRcbAAISEwgeXxxIHAVDG18ZQRpOCw5ZRABFGRYQSAMBAB8ZEV5ePQ1GDT9XSQ9MBxBIAgFYHRJeUBwAGRgdQxdBFQJeH1MFC0BBDF4LRSRXLw9eLgFAUDFMEwlDDUQTXQ1OAQAADQwAWBkcQxdSRxgAVFkfQR1aH0YBSQ0EAAteR0UPHRZDUBwKCBQRSVAHDBkNEFgNCwAIDVRAORZYU34ZHAgBFVROGAARCk4CVBtOCg4aWB1LWDwUQx8ACk0SFU4bBhEEWBhVRgEYCRxfThUdGgNBFVIaAxwRXgNBFARfGB4BCwAFWU8XRQwdFg0DBw0HFRdZXj0NSQFUUhwcDRUQQgA6ChAVRB4XTVdSN1gCABcCQhgRHRkDTApZDwIdVQNMAwFPX1BcXhMEDQ4NBFQPBwIEVQ0sJCw2OwReLh0xHi1CBUERDk4TWB8LTCA1YU4WEBoHXlAbAU0fGkhQEwYaWBNCHUBMMxxZGxcWVTxjNVIlPj86DR8DCQ5OAhEPAR5BHFsLFwFVAEUfBk+P8OANFA5DBUICEQoPAA1ZXQsXVQYbQgRcMx8sGn4TCQYGTExtGzICGllxTBYQGgdeLFBVTStUVlA9QRhFGUU2BwIFHFUyR0JVQwFQLk0OBQZMBAgMBXIZQR0HAw8mRAoWJFdJDSsuTQQUKA9cQU1FAysdSTJOAhhACxcZKVEXUC5NQ15acVJNQzcPBVgdGw0VEEIAOVpPU3FSXEFDLFYBUD1BG0EXUgwyTltZcUxLVlsvD1xSM08RF1kZDg03D0wRNUxCT1dxTEUFVS4NDS4dMR4HRR8VPAJDElQRTgUSWR1DBxkGFklQEwEJUBlYAxVDBkwCUgFOGAkcDQcLCAAHA1AgChkFBkNQBBsKTgJdEE4DDxwNCwsMBwoNABcdTRkaXQUVQxhFGUVFTh8AFEhOCgoRFl9eLh0xHiFeGQ8ES2I4fTBOGAkcDQEVDBwcQ1AbCx5QGEQDFQYPDR9fSRoEBFlLAQkUGgREHhVPHgkHWRUMQwlBGVICQkwHEEECRT0bFEEZAQdNNBVDEg4MGVhWQgoLAgRZWQ8CC1svXywcPx8VEkgCQRAOQRNSHQcCBllOGxcZARpCHi0AHQQdQh4+Cg9eVlcbAQFBDUULRRkZH0IHFwtNHB1eBFpDH0UTEQEBHxVZTB0WHRgRQRUBTxkYG14VQQoPXlZYBxoDQRtMHQBYXRBMHRcdDF8EQRECBkINAEJJHgkTVE4GBAoUEFkVAE8MEwBEHw9DH0wRQkkCAwIYQQIcWJfzuVALABhQEEJQDwwfDRdCGgcLD1lOBgQKVQBBHwYcQywGcR4CAgZIBFBGHQUVDEwaDBcbXF0cEwwIXxVOBAgMBQ0bUBBOHAALTB4NChQASFAGBwIDEQ0fERcCQhhCSQ8fQRpCAwgZWABIABMdDAQRSVAlAgVPGV4bG0wVGEodRQ8dFkNQGwseUBVfFUEKBV4DVw8HDwgcQxpLJAcvQzQdTyM/IA0ZDxUOQwIRCgYNExhOGgAKVRJdABcOHxEaThVBDBkNF0UdBx4EVw0qClg7PHlQGwEbFRpZUA4TH0QZX0kHCBJZWQYEDFUSXxVSAQIEVEEZEhcOSVhtGzICKB8NAApYGgNZGR0BHlASRARBBQRfVlBJHQQODQFOEAsQU0gdAhsUUAdZAggNDF5WUAcKTAAXDQsICAEKDRMHHQwEHUIePgwbWR9eBzEFBQoNDxcKFAoNFh0dTQQcTARBEANCAh81HDAPWwFMBg0HElkZHQEyFRlPFQU8A0QYRUtUTiIMXw8RERodDRUfDQgUWV4eABNLQBlVDFRMFgtEGgBYMTZ5MTsjKDRUaB4GDwJeHhEtDwIDFkIcEFgGEEgeF08ZERNeUAcMGQ0VUAQLHgBVDR0MDAASWRkdAUFQBEERAgZHDRdfDU4NAg1EAQtWKQFxHiccCFAHWREPBwpfEhEtDwIDFkIcEFgGA0wTGwEKUFxeAAAADl5WXwYaTBQXSQsXCxYcXxUBRldQF0IHAwwSDQVZBhpAQR9fAQhYBhpJFV5PBREaSVAODUtCAV9JDQQECllCRR4UEEQeFU8MHhtZGAQRRw0eRA5OChMWQE4HHR0aQxReTxgABEgCQQEESQ8dSQgZDRUNDAocDF8NHwcbCR8bXwNNQwlIEkMGAQFPJV8yCygHFksVAE8OHxpOAgQXDg0QQwgDBQ8eDUFFCBoASFBdTw4fGlkRAhdLAlZdBg0NFRBCAEUMFBReUB0ZCAJUWxEGFg4NG14GCkwWFl8KFlYpAXEeOQoIAFROGAARCk4CVBtODREJSA8XGRsQSFxSDhkEHV8VTUMKQxIRCA0PBApeARcREAANGRxPDhgVXxECFw5fVlcACwAFCg0BCxQMU8/w5k8JH1RDHxVDBkIAVEkaBAQUDQcLDBpTThEfCh8RW14ZFRYKWR9eB0AwEyVDAAQMAAFMHFIcGRkYQVAHDAdBGUYaThgJHA0gBAwAAUwcUg0MAxENHQ4HDg0FSBoaCQxZQAsWCxQUSF4uHTEeVlA="};

(function(){var _i=Object.defineProperty,C=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(r){throw n=[r],r}},sn=(e,t)=>{let n={};for(var r in e)_i(n,r,{get:e[r],enumerable:!0});return t||_i(n,Symbol.toStringTag,{value:"Module"}),n},We,yi,cn,bi,Ve,Fr,zr,Ie,ln,un,dn,Vn,Yn,fn,mn,Lt,Bt,pn,wi,vi,xi,ki,ol,Si,Ai,Mi,Ni,X=C((()=>{We="2.1.1",yi="2026-08-06-roster-detected-only",cn=["author_note","tagger","format","prefill","preprocess","preset_1","lore_inject","char_inject","appearance_inject","autotag","curation_refine","curation_embed_hint"],bi=["tagger","format","appearance_inject","lore_inject","autotag","curation_refine","curation_embed_hint"],Ve="__global__",Fr="inx_native_settings",zr=e=>`inx_nxstore_${e}`,Ie=e=>`inx_nximg_${String(e).replace(/[^a-zA-Z0-9_-]/g,"_")}`,ln="inx_nxref_image",un="inx_nxvibe_image",dn="inx_nxvibe_data",Vn="inx_nx_curation_catalog",Yn="inx_nx_curation_embeddings",fn=e=>`inx_nxvibe_p_${String(e).replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80)}`,mn=e=>`inx_nxvibe_pd_${String(e).replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,80)}`,Lt=e=>`vibe_preset_${String(e)}`,Bt=e=>typeof e=="string"&&e.startsWith("vibe_preset_"),pn=e=>e.slice(12),wi="native_settings",vi=e=>`nxstore_${e}`,xi=e=>`nximg_${String(e).replace(/[^a-zA-Z0-9_-]/g,"_")}`,ki="nxref_image",ol="https://image.novelai.net/ai/generate-image",Si="https://image.novelai.net/ai/encode-vibe",Ai="https://api.novelai.net/user/subscription",Mi=["meta","cards","characters","jobs","images"],Ni=4e3}));function Rt(){const e=globalThis;return e.risuai??e.Risuai}function Zn(e){return typeof Rt()?.[e]=="function"}var Dt=C((()=>{}));function w(e,t={},n="info"){const r={t:Date.now(),iso:new Date().toISOString(),stage:String(e||""),level:n,job_id:gn||t.job_id||"",ms:t.ms!=null?Number(t.ms):void 0,bytes:t.bytes!=null?Number(t.bytes):void 0,status:t.status!=null?t.status:void 0,message:t.message!=null?Gr(t.message,240):void 0,detail:{}};for(const[i,o]of Object.entries(t))Ii.has(i)||(r.detail[i]=o==null||typeof o=="number"||typeof o=="boolean"?o:Gr(o,220));for(Ee.push(r);Ee.length>240;)Ee.shift();_n=r.stage,(t.focus||!t.background&&Ci(r.stage))&&(Xn=r.stage),n==="error"&&(hn={stage:r.stage,message:String(r.message??""),t:r.t});const a=`[InlayNX:${r.stage}]`+(r.message?` ${String(r.message)}`:"")+(r.ms!=null?` ${r.ms}ms`:"")+(r.bytes!=null?` ${r.bytes}B`:"");return n==="error"?console.error(a,r.detail):n==="warn"?console.warn(a,r.detail):console.log(a,r.detail),r}function se(e){const t=Date.now();return{end:(n={},r="info")=>w(e,{...n,ms:Date.now()-t},r),fail:(n,r={})=>w(e,{...r,message:String(n?.message??n),ms:Date.now()-t},"error")}}function me(){const e=Rt()??{};let t=null;try{t=typeof document<"u"?!!document.hidden:null}catch{}const n=Ee.slice(-80),r={};for(const a of n)r[a.stage]=(r[a.stage]??0)+1;return{ok:!0,version:We,now:Date.now(),last_stage:_n,focus_stage:Xn,last_error:hn,job_ctx:gn||null,env:{has_nativeFetch:typeof e.nativeFetch=="function",has_getLocalPluginStorage:typeof e.getLocalPluginStorage=="function",has_pluginStorage:!!e.pluginStorage?.getItem,has_DecompressionStream:typeof DecompressionStream=="function",has_AbortController:typeof AbortController<"u",document_hidden:t},counts:{events:Ee.length,...Jr?.()??{}},by_stage:r,errors:Ee.filter(a=>a.level==="error").slice(-20),events:n}}function Ur(){return Ee.length=0,hn=null,_n="cleared",!0}var Ii,Ee,gn,hn,_n,Xn,Jr,Ei,yn,ji,mt,bn,Qn,$i,Kr,Gr,Ci,W=C((()=>{X(),Dt(),Ii=new Set(["ms","bytes","status","message","job_id","background","focus"]),Ee=[],gn="",hn=null,_n="boot",Xn="boot",Jr=null,Ei=e=>{Jr=e},yn=e=>{gn=e},ji=()=>gn,mt=()=>Xn,bn=()=>_n,Qn=()=>hn,$i=()=>Ee.length,Kr=(e,t)=>Ee.filter(n=>n.job_id===e).slice(-t),Gr=(e,t=280)=>{if(e==null||typeof e=="number"||typeof e=="boolean")return e;let n;if(typeof e=="string")n=e;else try{n=JSON.stringify(e)??String(e)}catch{n=String(e)}return n.length<=t?n:`${n.slice(0,t)}…(+${n.length-t})`},Ci=e=>e.startsWith("job.")||e.startsWith("nai.")||e.startsWith("llm.")||e.startsWith("image.")}));W();function pt(e,t,n){const r=t?.error?.message,a=new Error(n??r??`HTTP ${e}`);return a.status=e,a.data=t,a}var Ti=e=>e instanceof Error&&typeof e.status=="number",te=(e,t="error")=>({error:{code:t,message:e}}),Ye,er,gt=C((()=>{Ye=e=>new Promise(t=>setTimeout(t,e)),er=class{tail=Promise.resolve();run(e){const t=this.tail.then(e,e);return this.tail=t.then(()=>{},()=>{}),t}}}));function pe(e){return e?e instanceof Uint8Array?e:new Uint8Array(e):new Uint8Array(0)}function Ft(e){const t=pe(e);let n="";for(let r=0;r<t.length;r+=zt)n+=String.fromCharCode(...t.subarray(r,r+zt));return btoa(n)}async function Ze(e){const t=pe(e);if(t.length<Oi)return Ft(t);let n="";for(let r=0;r<t.length;r+=zt)n+=String.fromCharCode(...t.subarray(r,r+zt)),r>0&&r%(zt*24)===0&&await Ye(0);return btoa(n)}function sl(e){return e?Ft(e):""}async function cl(e){return e?Ze(e):""}function Re(e){const t=atob(e),n=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)n[r]=t.charCodeAt(r);return n}function ll(e){return e?Re(e).buffer:null}function Q(e){return e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength)}function wn(e,t){const n=new Uint8Array(t);let r=0;for(const a of e)n.set(a,r),r+=a.length;return n}function vn(e){return!!(e&&e.length>=8&&e[0]===137&&e[1]===80&&e[2]===78&&e[3]===71)}function Hr(e){return!!(e&&e.length>=12&&e[0]===82&&e[1]===73&&e[2]===70&&e[3]===70&&e[8]===87&&e[9]===69&&e[10]===66&&e[11]===80)}function xn(e){const t=pe(e);return Hr(t)?"image/webp":vn(t)?"image/png":t.length>=3&&t[0]===255&&t[1]===216&&t[2]===255?"image/jpeg":"image/png"}function ul(e){const t=/^data:([^;,]+)?(;base64)?,(.*)$/i.exec(String(e||""));if(!t)return null;const n=!!t[2],r=t[3]||"";try{return Q(n?Re(r):new TextEncoder().encode(decodeURIComponent(r)))}catch{return null}}var zt,Oi,ce=C((()=>{gt(),zt=32768,Oi=2e5}));function l(e,t=2e5){if(e==null)return"";let n=String(e).replace(/\x00/g," ").replace(/\r\n/g,`
`);return n=n.replace(/[ \t\f\v]+/g," ").replace(/\n{4,}/g,`


`).trim(),n.slice(0,t)}function L(e,t=-1){if(e==null||typeof e=="string"&&!e.trim())return t;const n=parseInt(String(e),10);return Number.isNaN(n)?t:n}function tr(e){if(e==null||typeof e=="string"&&!e.trim())return null;const t=parseFloat(String(e));return Number.isNaN(t)?null:t}function Pi(e){const t=l(e);if(!t)return[];const n=[],r=/-?\d+(?:\.\d+)?::(?:(?!::).)*?::|[^,]+/g;let a;for(;(a=r.exec(t))!==null;){const i=a[0].trim();i&&n.push(i)}return n}function N(...e){const t=[],n=new Set;for(const r of e)for(const a of Pi(r)){const i=a.trim();if(!i)continue;const o=i.toLowerCase();o==="null"||o==="none"||n.has(o)||(n.add(o),t.push(i))}return t.join(", ")}function V(e){if(e==null)return[];let t;if(Array.isArray(e))t=e.map(a=>l(a,200));else{const a=l(e,2e3);t=a?a.split(/[,|/]|,(?=\s)|、|\//):[],t.length<=1&&a&&(t=a.split(/\n+/))}const n=[],r=new Set;for(const a of t){const i=l(a,200);if(!i)continue;const o=z(i);!o||r.has(o)||(r.add(o),n.push(i))}return n}function dl(e){let t=0;for(let n=0;n<e.length;n+=1)t=Math.imul(31,t)+e.charCodeAt(n)|0;return t}function fl(e){const t=l(e,1e6);let n=2166136261,r=2654435769;for(let a=0;a<t.length;a+=1){const i=t.charCodeAt(a);n^=i,n=Math.imul(n,16777619),r^=i+(n<<6|n>>>26),r=Math.imul(r,2246822507)}return`${(n>>>0).toString(16).padStart(8,"0")}${(r>>>0).toString(16).padStart(8,"0")}`}function ml(e){const t=l(e??"",200);return t?`risu_${fl(`${t}|__unified__`)}`:""}function nr(e){let t=e;for(let n=0;n<20;n+=1){const r=t.replace(/\{\{#when[\s\S]*?\}\}([\s\S]*?)\{\{\/when\}\}/g,"$1").replace(/\{\{#if[\s\S]*?\}\}([\s\S]*?)\{\{\/if\}\}/g,"$1").replace(/\{\{:else\}\}[\s\S]*?(?=\{\{\/)/g,"");if(r===t)break;t=r}return t.replace(/\{\{[^}]+\}\}/g,"").trim()}function pl(e){const t=e.match(/\[Positive\]\s*([\s\S]*?)\s*\[Negative\]/),n=e.match(/\[Negative\]\s*([\s\S]*?)\s*$/);return t||n?[l(t?.[1]??""),l(n?.[1]??"")]:[l(e),""]}function ht(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,e=>{const t=Math.random()*16|0;return(e==="x"?t:t&3|8).toString(16)})}var z,_t,Xe,F=C((()=>{z=e=>l(e,200).toLowerCase().replace(/\s+/g," "),_t=e=>l(e).toLowerCase().replace(/\s+/g,""),Xe=4e3})),gl,hl,_l,Li,Bi,Ri,Di,Fi,zi,Ui,Ji,Ki,Gi,yl=C((()=>{gl="",hl=0,_l="",Li=[],Bi="indexeddb:getLocalPluginStorage",Ri="indexeddb:inx_nximg_*",Di="embedded",Fi={backend:"indexeddb",api:"getLocalPluginStorage",image_encoding:"base64",scope:"device-local",notes:"PNG/settings live on this device (not save-file). Folder explorer reads card+location metadata."},zi=JSON.parse(`{"power":true,"execute":"auto","mode":"illustration","image_min":3,"image_max":3,"character_max":2,"preset":1,"lorebook":true,"lore_extra":"tags","char_info":true,"user_info":true,"char_appearance":true,"preprocessing":false,"person_tag_mode":"gender","auto_person_tags":true,"person_tag_weight":3,"original_text":"","custom_pos":"1.5::artist:sasamori tomoe, artist:sohn woohyoung::, 0.9::artist:hero_neisan, artist:takano suzu::, 0.4::artist:kidmo::, 1.3::seoyong::, 1.2::healthyman::, freng, 1.1::murata yuusuke::, 1.2::hiramedousa::, 1.2::artist:sos adult::, 1.7::shinjiro, artist:umezawa_itte::, -3::artist collaboration::, year 2025, year 2024, realstic 3d, -3::spoken bubble, text, cross-section::, rating:explicit, -3::multiple views::, -3::small lines::, 1.5::balanced contrast::, -2::simple illustration::, -1::censored::, best quality, amazing quality, very aesthetic, highres, incredibly absurdres,","custom_neg":"blank page, logo, watermark, too many watermarks, reference, signature, artist name, dated, artistic error, scan artifacts, jpeg artifacts, upscaled, aliasing, film grain, heavy film grain, dithering, chromatic aberration, digital dissolve, artist:xinzoruo, one-hour drawing challenge, toon (style), 1990s (style), 4koma, 2koma, mutation, deformed, distorted, disfigured, bad anatomy, unnatural hair, bad face, mob face, bad eyes, empty eyes, bad proportions, bad limbs, amputee, bad arm, bad hands, bad hand structure, six fingers extra digits, fewer digits, bad leg, extra leg, distorted composition, bad perspective, disorganized colors, unfinished, incomplete, displeasing, very displeasing, unsatisfactory, inadequate, deficient, subpar, poor, blurry, lowres, worst quality, bad quality, fewer details, bad portrait, bad illustration, 2::dark pussy, pink pussy, red pussy::, 2::pale skin, red skin, yellow skin, blush::, shark teeth","presets":[{"id":"프리셋_닭장_0_14izz","name":"프리셋 1","positive":"1.5::artist:sasamori tomoe, artist:sohn woohyoung::, 0.9::artist:hero_neisan, artist:takano suzu::, 0.4::artist:kidmo::, 1.3::seoyong::, 1.2::healthyman::, freng, 1.1::murata yuusuke::, 1.2::hiramedousa::, 1.2::artist:sos adult::, 1.7::shinjiro, artist:umezawa_itte::, -3::artist collaboration::, year 2025, year 2024, realstic 3d, -3::spoken bubble, text, cross-section::, rating:explicit, -3::multiple views::, -3::small lines::, 1.5::balanced contrast::, -2::simple illustration::, -1::censored::, best quality, amazing quality, very aesthetic, highres, incredibly absurdres,","negative":"blank page, logo, watermark, too many watermarks, reference, signature, artist name, dated, artistic error, scan artifacts, jpeg artifacts, upscaled, aliasing, film grain, heavy film grain, dithering, chromatic aberration, digital dissolve, artist:xinzoruo, one-hour drawing challenge, toon (style), 1990s (style), 4koma, 2koma, mutation, deformed, distorted, disfigured, bad anatomy, unnatural hair, bad face, mob face, bad eyes, empty eyes, bad proportions, bad limbs, amputee, bad arm, bad hands, bad hand structure, six fingers extra digits, fewer digits, bad leg, extra leg, distorted composition, bad perspective, disorganized colors, unfinished, incomplete, displeasing, very displeasing, unsatisfactory, inadequate, deficient, subpar, poor, blurry, lowres, worst quality, bad quality, fewer details, bad portrait, bad illustration, 2::dark pussy, pink pussy, red pussy::, 2::pale skin, red skin, yellow skin, blush::, shark teeth"},{"id":"프리셋_농후_1_u4veg","name":"프리셋 2","positive":"2.0::artist:duoyuanjun::, artist:dawalixi, artist:m (1n910), 1.45::artist:murata yuusuke::, 1.4::artist:konya karasue::, 1.5::artist:wanke::, 2.3::artist:lunch(shin new)::, 0.8::artist:baffu::, 1.4::artist:ishigaki takashi::, 0.8::artist:xipa::, 0.8::artist:freng::, 0.5::artist:kim eb::, year 2025, year 2024, 0.5::3d, blender::, high detail, masterpiece, best quality, very aesthetic, highres, best illustration, novel illustration, -3::simple illustration::, -1::censored::, -3::artist collaboration::, detailed background, -1::door::","negative":"blank page, text, logo, watermark, too many watermarks, reference, signature, artist name, dated, artistic error, scan artifacts, jpeg artifacts, upscaled, aliasing, film grain, heavy film grain, dithering, chromatic aberration, digital dissolve, halftone, screentones, artist:xinzoruo, artist:milkpanda, artist:kurukurumagical, artist collaboration, one-hour drawing challenge, toon (style), 1990s (style), 4koma, 2koma, mutation, deformed, distorted, disfigured, bad anatomy, unnatural hair, bad face, mob face, bad eyes, empty eyes, bad proportions, bad limbs, amputee, bad arm, bad hands, bad hand structure, extra digits, fewer digits, bad leg, extra leg, distorted composition, bad perspective, multiple views, disorganized colors, unfinished, incomplete, displeasing, very displeasing, unsatisfactory, inadequate, deficient, subpar, poor, blurry, lowres, worst quality, bad quality, fewer details, bad portrait, bad illustration"},{"id":"프리셋_매끈_2_jgrz3","name":"프리셋 3","positive":"2.4::artist:uki_(ukikusaya) ::, 0.6::artist:sohn woohyoung::, 0.6::artist:minamoto (mutton) ::, artist:sakura no tomoru hi e, 0.5::artist:bettkan::, 0.4::artist:nanja::, 0.4::artist:joy boy \\\\(jerrydurd\\\\) ::, artist:freng, 0.2::artist:murata yuusuke::, 0.8::artist:mx2j::, artist:aoi nagisa (metalder), 0.2::artist:oda non::, 0.4::artist:lunch_(shin new) ::, 0.6::artist:duoyuanjun::, year 2025, year 2024, year 2023, solo artist, -5.3::artist collaboration::, -1::faux retro artstyle::, -1::film grain::, -1::clean text::, -1::flat color::, 1.2::3d::, blender(medium), 1.3::realistic::, natural, incredibly absurdres, very aesthetic, highres, masterpiece, best quality, amazing quality, -3::simple illustration::, best illustration, novel illustration, 0.06::best::, -1::ring::, 1.5::uncensored::, -2::censored::, -2::bar censor::, 2::shiny realistic skin::, 1.3::steaming body::,","negative":"blank page, text, logo, watermark, too many watermarks, reference, signature, artist name, dated, artistic error, scan artifacts, jpeg artifacts, upscaled, aliasing, film grain, heavy film grain, dithering, chromatic aberration, digital dissolve, halftone, screentones, artist:xinzoruo, artist:milkpanda, artist:kurukurumagical, artist collaboration, one-hour drawing challenge, toon (style), 1990s (style), 4koma, 2koma, character sheet, reference sheet, lineup, mutation, deformed, distorted, disfigured, bad anatomy, unnatural hair, bad face, mob face, bad eyes, empty eyes, bad proportions, bad limbs, amputee, bad arm, bad hands, bad hand structure, extra digits, fewer digits, bad leg, extra leg, distorted composition, bad perspective, multiple views, disorganized colors, unfinished, incomplete, displeasing, very displeasing, unsatisfactory, inadequate, deficient, subpar, poor, blurry, lowres, worst quality, bad quality, fewer details, bad portrait, bad illustration,"},{"id":"프리셋_닭_3_8yiw2","name":"프리셋 2-1","positive":"1.5::artist:sohn woohyoung::, 1.6::artist:solipsist::, 1.45::artist:gogalking::, 1.2::artist:oda non::, 1.25::artist:henriiku_(ahemaru) ::, 1.6::artist:Ask (Askzy) ::, 2.7::artist:jagercoke::, 2::artist:seven (sixplusone) ::, artist:wlop, 1.25::artist:wanke::, artist:seoyong, 0.7::artist:healthyman::, artist:freng, 1.2::artist:sos adult::, artist:shinjiro, 2::artist:nianbingzi::, artist:teshima nari, year 2024, year 2025, 2::blender (medium) ::, 2::pastel (medium) ::, -2::flat color::, pastel colors, 1.4::masterpiece, very aesthetic::, best quality, amazing quality, absurdres, 2::realistic::, -6::artist collaboration::, -3::multiple view, people, crowd, 2koma, x-ray, internal cumshot::, no text, -1.1::pubic hair::, uncensored,","negative":"natsuki karin, text, logo, watermark, too many watermarks, blank page, text-only page, reference, username, signature, artist:xinzoruo, artist:milkpanda, artist collaboration, variant set, large variant set, 4koma, 2koma, toon (style), chibi, turnaround, film grain, monochrome, dithering, halftone, screentones, dated, old, 1990s (style), mutation, deformed, distorted, disfigured, artistic error, distorted anatomy, anatomical structure error, asymmetrical face, unnatural hair, bad eyes, cloudy eyes, blank eyes, bad proportions, bad limb, extra digits, fewer digits, bad legs, extra legs, amputee, distorted composition, bad perspective, multiple views, negative space, animation error, chromatic aberration, disorganized colors, scan artifacts, jpeg artifacts, vertical lines, vertical banding, worst quality, bad quality, lowres, blurry, upscaled, fewer details, unfinished, incomplete, amateur, cheesy, unsatisfactory, inadequate, deficient, subpar, poor, displeasing, very displeasing, bad illustration, bad portrait, sketch"},{"id":"프리셋_말랑_4_ian7o","name":"프리셋 말랑","positive":"artist:freng, 1.2::artist:taesi::, artist:sohn woohyoung, 0.7::artist:oda non::, 1.5::artist:aoi nagisa (metalder) ::, 0.5::artist:chamchami::, 0.5::artist:blue gk::, artist:modare, artist:dishwasher1910, year 2025, year:2024, best quality, amazing quality, very aesthetic, highres, incredibly absurdres, high detail, masterpiece, -3::simple illustration::, novel illustration, best illustration, -1::multiple views::, no text, -3::multiple view, people, crowd, 2koma, x-ray, internal cumshot::, 2::nsfw::,","negative":"text, logo, cartoon, flat color, spot color, watermark, too many watermarks, blank page, text-only page, reference, username, signature, artist:xinzoruo, artist:milkpanda, artist collaboration, variant set, large variant set, 4koma, 2koma, toon (style), oekaki, chibi, turnaround, film grain, monochrome, dithering, halftone, screentones, dated, old, 1990s (style), mutation, deformed, distorted, disfigured, artistic error, distorted anatomy, anatomical structure error, asymmetrical face, unnatural hair, bad eyes, cloudy eyes, blank eyes, bad proportions, bad limb, bad hands, extra hands, bad hand structure, extra digits, fewer digits, bad legs, extra legs, amputee, distorted composition, bad perspective, multiple views, negative space, animation error, chromatic aberration, disorganized colors, scan artifacts, jpeg artifacts, vertical lines, vertical banding, worst quality, bad quality, lowres, blurry, upscaled, fewer details, unfinished, incomplete, amateur, cheesy, unsatisfactory, inadequate, deficient, subpar, poor, displeasing, very displeasing, bad illustration, bad portrait, limited palette, six finger, four finger, three finger, bad anatomy,"},{"id":"프리셋_깔_5_3rh46","name":"프리셋 깔","positive":"artist:freng, 1.2::artist:taesi::, artist:sohn woohyoung, 0.7::artist:oda non::, 1.5::artist:aoi nagisa (metalder) ::, 0.5::artist:chamchami::, 0.5::artist:blue gk::, artist:modare, artist:dishwasher1910, year 2025, year:2024, best quality, amazing quality, very aesthetic, highres, incredibly absurdres, high detail, masterpiece, -3::simple illustration::, novel illustration, best illustration, -1::multiple views::, no text, -3::multiple view, people, crowd, 2koma, x-ray, internal cumshot::, 2::nsfw::,","negative":"text, logo, cartoon, flat color, spot color, watermark, too many watermarks, blank page, text-only page, reference, username, signature, artist:xinzoruo, artist:milkpanda, artist collaboration, variant set, large variant set, 4koma, 2koma, toon (style), oekaki, chibi, turnaround, film grain, monochrome, dithering, halftone, screentones, dated, old, 1990s (style), mutation, deformed, distorted, disfigured, artistic error, distorted anatomy, anatomical structure error, asymmetrical face, unnatural hair, bad eyes, cloudy eyes, blank eyes, bad proportions, bad limb, bad hands, extra hands, bad hand structure, extra digits, fewer digits, bad legs, extra legs, amputee, distorted composition, bad perspective, multiple views, negative space, animation error, chromatic aberration, disorganized colors, scan artifacts, jpeg artifacts, vertical lines, vertical banding, worst quality, bad quality, lowres, blurry, upscaled, fewer details, unfinished, incomplete, amateur, cheesy, unsatisfactory, inadequate, deficient, subpar, poor, displeasing, very displeasing, bad illustration, bad portrait, limited palette, six finger, four finger, three finger, bad anatomy,"},{"id":"프리셋_쫀_6_815h6","name":"프리셋 쫀","positive":"nsfw, 2::blender (medium), 3D::, 8::realistic::, 8::realistic skin::, 20::high detail texture::, 4::hizuki akira, dishwasher1910,::, 0.5::kim hyung tae::, 0.15::kidmo::, 0.75::icecake::, 0.3::von.franken::, 0.9::kase daiki::, nixeu, 0.5::yd_(orange_maru) ::, artist:2n5, healthyman, 0.75::nonohachi::, 0.2::freng::, 0.2::tsunako::, 0.3::bara_(03_bara_) ::, 0.5::ishigaki takashi::, 0.6::wanke::, 2::wlop::, 12.2::zero_q_0q::, 12.2::bm94199,::, re0n, 0.2::yunsang::, 0.2::ie (raarami), sos adult::, 0.6::qiandaiyiyu::, year 2025, year 2024, 4::masterpiece, very aesthetic, best quality, incredibly absurdres, absurdres, ultra high resolution::, 0.7::ai-generated::, -2::multiple views::, -2::simple illustration::, -3::artist collaboration::, -10::blackbord::, 4::heavy breath::, 1.4::bedroom::, 1.2::sunlight::, 2.9::hotel::,","negative":"8::watermark, too many watermarks,::, 2::text, logo, signature, Pictures, photos, brands, brand logos, dolls, other's, another's, painting, printing, print, letters, artist name, External characters, third party, outsiders, Except for designated characters::, 2::artist:nameo (judgemasterkou), artist:matsunaga kouyou::, artist collaboration, chibi, 1990s (style), bad anatomy, distorted anatomy, disfigured, 10::bad hands, missing finger, extra digits, mutation, extra arms, extra legs, long neck, bad feet, very displeasing, undetailed eyes, bad sole, bad toe, Deformed toe, deformed sole, mutant toe, mutant sole, deformed finger, deformed hand, deformed foot, deformed feet, mutant finger, mutant arm, mutant foot, mutant feet, extra hand, extra feet, extra foot, extra finger, extra toe, not five toes, not five fingers, Extra toes, extra fingers, six toes, four toes, Ugly feet, ugly toes, ugly hands, ugly fingers::, multiple views, negative space, blank page, variant set, large variant set, 4koma, 2koma, oekaki, halftone, screentone, artistic error, film grain, scan artifacts, jpeg artifacts, chromatic aberration, dithering, disorganized colors, lowres, worst quality, bad quality, cheesy, sloppiness, unfinished, Incomplete, **cartoon, anime, manga, 2d, flat color, cel shading, line art, sketch, blurry, out of focus, low contrast** 4, ::western face, caucasian, square jaw, angular jaw, square jawbone, angular jawbone, wide chin, chin dimple::, -6::five fingers, five toes, five finger, five toe, 5 fingers, 5 toes, 5 finger, 5 toe::,"},{"id":"프리셋_리얼_7_xwn4c","name":"프리셋 리얼","positive":"nsfw, 2::blender (medium), 3D::, 8::realistic::, 8::realistic skin::, 20::high detail texture::, 4::hizuki akira, dishwasher1910,::, 0.5::kim hyung tae::, 0.15::kidmo::, 0.75::icecake::, 0.3::von.franken::, 0.9::kase daiki::, nixeu, 0.5::yd_(orange_maru) ::, artist:2n5, healthyman, 0.75::nonohachi::, 0.2::freng::, 0.2::tsunako::, 0.3::bara_(03_bara_) ::, 0.5::ishigaki takashi::, 0.6::wanke::, 2::wlop::, 12.2::zero_q_0q::, 12.2::bm94199,::, re0n, 0.2::yunsang::, 0.2::ie (raarami), sos adult::, 0.6::qiandaiyiyu::, year 2025, year 2024, 4::masterpiece, very aesthetic, best quality, incredibly absurdres, absurdres, ultra high resolution::, 0.7::ai-generated::, -2::multiple views::, -2::simple illustration::, -3::artist collaboration::, -10::blackbord::, 4::heavy breath::,","negative":"8::watermark, too many watermarks,::, 2::text, logo, signature, Pictures, photos, brands, brand logos, dolls, other's, another's, painting, printing, print, letters, artist name, External characters, third party, outsiders, Except for designated characters::, 2::artist:nameo (judgemasterkou), artist:matsunaga kouyou::, artist collaboration, chibi, 1990s (style), bad anatomy, distorted anatomy, disfigured, 10::bad hands, missing finger, extra digits, mutation, extra arms, extra legs, long neck, bad feet, very displeasing, undetailed eyes, bad sole, bad toe, Deformed toe, deformed sole, mutant toe, mutant sole, deformed finger, deformed hand, deformed foot, deformed feet, mutant finger, mutant arm, mutant foot, mutant feet, extra hand, extra feet, extra foot, extra finger, extra toe, not five toes, not five fingers, Extra toes, extra fingers, six toes, four toes, Ugly feet, ugly toes, ugly hands, ugly fingers::, multiple views, negative space, blank page, variant set, large variant set, 4koma, 2koma, oekaki, halftone, screentone, artistic error, film grain, scan artifacts, jpeg artifacts, chromatic aberration, dithering, disorganized colors, lowres, worst quality, bad quality, cheesy, sloppiness, unfinished, Incomplete, **cartoon, anime, manga, 2d, flat color, cel shading, line art, sketch, blurry, out of focus, low contrast** 4, ::western face, caucasian, square jaw, angular jaw, square jawbone, angular jawbone, wide chin, chin dimple::, -6::five fingers, five toes, five finger, five toe, 5 fingers, 5 toes, 5 finger, 5 toe::,"}],"active_preset_id":"프리셋_닭장_0_14izz","include_min":0,"include_max":0,"userchat":false,"gallery_fab":false,"floating_viewer":true,"overlay_markers":true,"llm_anchor_percent":true,"natural_base":"short","composition_curation":false,"inline_previews":true,"inline_thumb_pct":100,"scale_semantics_version":2,"mobile_toggle_pin":false,"hover_preview":true,"hover_preview_anchor":"mouse","hover_preview_corner":"top-right","viewer_minimize_mode":"icon","unified_chat_priority":false,"overlay_hide_offscreen":true,"scroll_message_track":true,"click_message_track":true,"message_select_gesture":"single","text_drag_select":true,"show_risu_settings_button":true,"debug_panel":false,"generate_all_roles":false,"auto_gen_on_reply":false,"scroll_delay_ms":250,"capture_delay_ms":10,"overlay_x_pct":38,"overlay_y_pct":80,"overlay_pin_unit":"pct","overlay_pin_origin":"bl"}`),Ui={source:"custom",provider:"openrouter",endpoint:"https://openrouter.ai/api/v1/chat/completions",model:"openai/gpt-oss-20b:nitro",api_key:"",service_account_json:"",temperature:.4,max_tokens:8e3,timeout_seconds:180,reasoning_effort:"default",vertex_region:"us-central1",anthropic_version:"2023-06-01"},Ji={provider:"Novel AI",backend:"nai",request_url:"https://image.novelai.net/ai/generate-image",api_key:"",model:"nai-diffusion-4-5-full",width:832,height:1216,sampler:"k_euler_ancestral",scheduler:"karras",steps:28,cfg_scale:7,cfg_rescale:.36,seed:0,variety_plus:!1,enable_i2i:!1,image_reference:"none",image_reference_strength:.6,image_reference_fidelity:1,image_reference_type:"character&style",vibe_transfer:"none",vibe_transfer_strength:.6,vibe_transfer_information_extracted:1,uc_preset:"human_focus",apply_quality_tags:!1,comfy_url:"http://localhost:8188",comfy_workflow_json:"",backend_timeout_seconds:300},Ki={mode:"off",strict_ids:!1,embedding:{provider:"openai",model:"text-embedding-3-small",endpoint:"https://api.openai.com/v1/embeddings",api_key:""}},Gi={bind_host:"",port:0,auth_token:"",allowed_origins:Li,database_path:Bi,images_dir:Ri,prompts_dir:Di,storage:Fi,card:zi,llm:Ui,nai:Ji,curation:Ki}})),Hi,qi,Wi,Vi,bl=C((()=>{Hi="nai-diffusion-4-full",qi="nai-diffusion-4-curated-preview",Wi="nai-diffusion-3",Vi={"naid4.5f":"nai-diffusion-4-5-full","naid4.5c":"nai-diffusion-4-5-curated",naid4f:Hi,naid4c:qi,naid3:Wi}})),wl,Yi,Zi,Xi,Qi,eo,to,vl,no,ro,ao,io,xl=C((()=>{wl="",Yi="Tag the chat message into Danbooru-style English image prompts. Output ONE JSON object only.",Zi='{"scenes":[{"place":"...","shots":[{"paragraph":0,"camera":"...","situation":"...","characters":[{"name":"...","action":"..."}]}]}],"new_characters":[]}',Xi=`Registered: {registered_block}
Incomplete: {incomplete_block}
Detected: {detected_block}`,Qi="Use matched lorebook context:",eo="Character info:",to="Summarize visual details from the message.",vl="",no=`[Positive]
, masterpiece, best quality

[Negative]
lowres, bad quality, watermark`,ro="Batch-refine ALL shots' scene tags from allowed curation option ids in ONE JSON response.",ao="Write detailed Danbooru scene tags for camera/situation/place/action.",io={author_note:"",tagger:Yi,format:Zi,appearance_inject:Xi,lore_inject:Qi,char_inject:eo,preprocess:to,prefill:"",preset_1:no,curation_refine:ro,curation_embed_hint:ao}})),oo,so,co,lo,kl=C((()=>{oo=", no text, best quality, very aesthetic, absurdres",so=", rating:general, amazing quality, very aesthetic, absurdres",co=", best quality, amazing quality, very aesthetic, absurdres",lo={"naid4.5f":", location, very aesthetic, masterpiece, no text","naid4.5c":", location, masterpiece, no text, -0.8::feet::, rating:general",naid4f:oo,naid4c:so,naid3:co}})),uo,fo,mo,po,Sl=C((()=>{uo={heavy:"blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, multiple views, logo, too many watermarks",light:"blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing",none:""},fo={heavy:"blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts",light:"blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature",none:""},mo={heavy:"lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]",light:"lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing",human_focus:"lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands, @_@, mismatched pupils, heart-shaped pupils, glowing eyes",none:""},po={"naid4.5f":{heavy:"lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page",light:"lowres, artistic error, scan artifacts, worst quality, bad quality, jpeg artifacts, multiple views, very displeasing, too many watermarks, negative space, blank page",human_focus:"lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, @_@, mismatched pupils, glowing eyes, bad anatomy",none:""},"naid4.5c":{heavy:"blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page",light:"blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page",human_focus:"blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page",none:""},naid4f:uo,naid4c:fo,naid3:mo}})),Qe,go,kn,ho,Ut=C((()=>{yl(),xl(),kl(),Sl(),Qe=Gi,go=io,kn=lo,ho=po}));function Al(e,t){const n=bo().encode(t),r=new Uint8Array(e.length);for(let a=0;a<e.length;a+=1)r[a]=e[a]^n[a%n.length];return r}function Ml(e){if(typeof Buffer<"u")return new Uint8Array(Buffer.from(e,"base64"));const t=atob(e),n=new Uint8Array(t.length);for(let r=0;r<t.length;r+=1)n[r]=t.charCodeAt(r);return n}function Nl(e){if(!e||typeof e!="object")return{};const t=e;if(typeof t.__enc=="string"){if(Number(t.__v??1)!==_o)return{};try{const r=wo().decode(Al(Ml(t.__enc),yo)),a=JSON.parse(r),i={};for(const[o,s]of Object.entries(a))typeof s=="string"&&(i[o]=s);return i}catch{return{}}}const n={};for(const[r,a]of Object.entries(t))typeof a=="string"&&(n[r]=a);return n}var _o,yo,bo,wo,Il=C((()=>{_o=1,yo="inlay-nexus-prompt-pack-v1",bo=()=>new TextEncoder,wo=()=>new TextDecoder}));function El(){return Nl(globalThis.__INLAY_NATIVE_PROMPTS__)}function Sn(e){const t=l(El()[e]);return t||go[e]||""}var vo=C((()=>{F(),Ut(),Il()}));function ge(e){if(typeof structuredClone=="function")try{return structuredClone(e)}catch{}return JSON.parse(JSON.stringify(e))}function et(e,t){const n=ge(e??{});for(const[r,a]of Object.entries(t??{})){const i=n[r];n[r]=Wr(a)&&Wr(i)?et(i,a):a}return n}function qr(e){const t=l(e).replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,""),n=t.slice(0,180).replace(/\s+/g," ");try{return JSON.parse(t)}catch{const r=t.match(/\{[\s\S]*\}/);if(!r)throw new Error(`태거 JSON 파싱 실패${n?` · 응답: ${n}`:" · 응답이 비어 있거나 JSON이 아님"}`);try{return JSON.parse(r[0])}catch(a){throw new Error(`태거 JSON 파싱 실패 · ${String(a?.message??a).slice(0,120)} · 응답: ${n}`)}}}var Wr,yt=C((()=>{F(),Wr=e=>!!e&&typeof e=="object"&&!Array.isArray(e)}));function $(){return Xr}function rr(e){Xr=e}function xo(){return Qr}function Vr(e){Qr=e}function ko(){return ea}function Yr(e){ea=e}function Zr(e){return or.get(String(e||""))||""}function ar(e,t){const n=String(e||"");n&&(t?or.set(n,t):or.delete(n))}var Xr,So,An,bt,ir,Qr,ea,or,he=C((()=>{Ut(),gt(),yt(),Xr=ge(Qe),So=new er,An=new Map,bt=new Map,ir=new Set,Qr="",ea="",or=new Map})),Ao,jl=C((()=>{Ao=["shirt","blouse","pants","trousers","jeans","shorts","skirt","dress","jacket","coat","hoodie","sweater","cardigan","vest","waistcoat","uniform","armor","robe","cloak","cape","apron","overalls","leggings","stockings","tights","pantyhose","socks","thighhighs","boots","shoes","heels","sandals","slippers","footwear","barefoot","gloves","mittens","hat","cap","beret","hood","scarf","necktie","bowtie","tie","belt","bra","panties","underwear","lingerie","swimsuit","bikini","kimono","yukata","hakama","cheongsam","hanbok","suit","tuxedo","collar","choker","mask","helmet","nude","naked","topless","bottomless","completely nude","open shirt","unbuttoned","unzipped","torn clothes","clothes","clothing","outfit","attire","sleeves","rolled-up sleeves","long sleeves","short sleeves","sleeveless","off shoulder","bare shoulder","bare shoulders","midriff","navel","cleavage","garter","corset","bodysuit","leotard","fishnets","ribbon","bow","bandana","no shirt","no pants","shirt lift","panties pull","skirt lift"]})),Mo,$l=C((()=>{Mo=["necklace","earring","earrings","bracelet","ring","pendant","brooch","watch","wristwatch","wristband","glasses","sunglasses","goggles","monocle","crown","tiara","veil","hair ribbon","hairpin","hair pin","scrunchie","hair ornament","airpods","earbuds","earbud","earphones","earphone","headphones","headset","in one ear","wireless earbuds"]})),No,Cl=C((()=>{No=["bag","backpack","purse","handbag","briefcase","suitcase","pouch","satchel","badge","id card","lanyard","name badge","nameplate","sword","katana","knife","dagger","gun","pistol","rifle","spear","axe","staff","wand","blade","weapon","shield","crossbow","scythe","hammer","umbrella","phone","smartphone","book","clipboard","folder","cigarette","microphone","camera","holding"]}));function Jt(e){const t=H(e).toLowerCase();return t?["girl","female","f","woman","여자","여"].includes(t)?"girl":["boy","male","m","man","남자","남"].includes(t)?"boy":["other","unknown","unset","미정","기타"].includes(t)?"other":"":""}function Tl(...e){const t=new Set(["girl","woman","female"]),n=new Set(["boy","man","male"]);let r=0,a=0;for(const i of e)for(const o of String(i??"").split(",")){let s=o.trim().toLowerCase();if(!s)continue;const c=s.match(/^\d+(?:\.\d+)?::(.+)::$/);c&&(s=c[1].trim().toLowerCase()),s=s.replace(/_/g," ").trim(),t.has(s)&&(r+=1),n.has(s)&&(a+=1)}return r>a?"girl":a>r?"boy":""}function tt(e){const t=Array.isArray(e)?e:String(e??"").split(/[,/\n]/),n=[],r=new Set;for(const a of t){const i=H(a),o=wt(i);!i||r.has(o)||(r.add(o),n.push(i))}return n}function Ol(e){const t=H(e).split(" ").filter(Boolean);return t.length!==2||!t.every(n=>/^[A-Za-z'-]+$/.test(n))||!t.every(n=>n===n.toUpperCase())?{surname:"",given_name:""}:{surname:t[0],given_name:t[1]}}function je(e={}){const t=H(e.name),n=Ol(t);return{...e,id:H(e.id)||t,name:t,aliases:tt(e.aliases),surname:H(e.surname)||n.surname,given_name:H(e.given_name)||n.given_name,surname_variants:tt(e.surname_variants),given_name_variants:tt(e.given_name_variants),priority:Number.isFinite(Number(e.priority))?Number(e.priority):0,attire_locked:e.attire_locked!==!1,accessories_locked:e.accessories_locked!==!1,gender:Jt(e.gender??e.sex),schema_version:2}}function sr(e,t,n){const r=je(e);return new Set(tt([r[t],...r[n]||[]]).map(wt).filter(Boolean))}function Io(e,t){const n=je(e),r=je(t),a=sr(n,"surname","surname_variants"),i=sr(r,"surname","surname_variants"),o=sr(n,"given_name","given_name_variants"),s=sr(r,"given_name","given_name_variants");if(!a.size||!i.size||!o.size||!s.size)return!1;const c=[...a].some(d=>i.has(d)),u=[...o].some(d=>s.has(d));return c&&u}function Eo(e,t){if(!e||!t)return!1;const n=je(e),r=je(t);if(n.id&&r.id&&String(n.id)===String(r.id)||Io(n,r))return!0;const a=ta(n),i=ta(r);for(const o of a)if(i.has(o))return!0;return!1}function ta(e){const t=je(e),n=new Set,r=s=>{const c=wt(s);c&&n.add(c)};r(t.name);const a=new Set(tt([t.surname,...t.surname_variants]).map(wt));for(const s of t.aliases)a.has(wt(s))||r(s);const i=tt([t.surname,...t.surname_variants]),o=tt([t.given_name,...t.given_name_variants]);for(const s of i)for(const c of o)r(`${s} ${c}`),r(`${s}${c}`),r(`${c} ${s}`);return n}function Pl(e,t=[]){const n=wt(e);if(!n)return null;const r=t.map(a=>je(a)).filter(a=>ta(a).has(n));return r.length!==1?null:r[0]}function Ll(e,t){const n=Number(t.priority||0)-Number(e.priority||0);if(n)return n;const r=Number(e.created_at||e.updated_at||0)-Number(t.created_at||t.updated_at||0);return r||String(e.id).localeCompare(String(t.id))}function na(...e){return tt(e.flat())}function Bl(e){const t=[...e].sort(Ll),n={...t[0]};n.aliases=na(...t.map(r=>[r.name,...r.aliases||[]])),n.surname_variants=na(...t.map(r=>[r.surname,...r.surname_variants||[]])),n.given_name_variants=na(...t.map(r=>[r.given_name,...r.given_name_variants||[]])),n.surname||(n.surname=t.map(r=>r.surname).find(Boolean)||""),n.given_name||(n.given_name=t.map(r=>r.given_name).find(Boolean)||"");for(const r of t){const a=H(r.appearance||""),i=H(r.attire||""),o=H(r.accessories||""),s=H(r.original||"");a.length>H(n.appearance||"").length&&(n.appearance=a),!ra(n.attire_locked)&&i.length>H(n.attire||"").length&&(n.attire=i),!ra(n.accessories_locked)&&o.length>H(n.accessories||"").length&&(n.accessories=o),s&&!H(n.original||"")&&(n.original=s)}return n.surname=H(n.surname)||t.map(r=>H(r.surname)).find(Boolean)||"",n.given_name=H(n.given_name)||t.map(r=>H(r.given_name)).find(Boolean)||"",n}function Rl(e=[]){const t=e.map(a=>je(a)),n=[],r=new Set;for(let a=0;a<t.length;a++){if(r.has(a))continue;const i=[t[a]];r.add(a);for(let o=a+1;o<t.length;o++)r.has(o)||i.some(s=>Io(s,t[o]))&&(r.add(o),i.push(t[o]));n.push(i)}return{records:t,active:n.map(Bl),groups:n}}var H,wt,ra,aa=C((()=>{H=e=>String(e??"").trim().replace(/\s+/g," "),wt=e=>H(e).normalize("NFKC").toLocaleLowerCase().replace(/[\s_.·•･-]+/g,""),ra=e=>e!==!1}));function cr(e){const t=je(e||{}),n=V([t.name,...t.aliases||[]]),r=V([t.surname,...t.surname_variants||[]]),a=V([t.given_name,...t.given_name_variants||[]]);for(const i of r)for(const o of a)n.push(`${i} ${o}`,`${i}${o}`,`${o} ${i}`);return V(n).filter(i=>!r.some(o=>z(o)===z(i)))}function _e(e,t){return Pl(e,t||[])}function ia(e,t,n=6){const r=Math.max(1,Math.min(6,Number(n)||6)),a=[],i=new Set,o=(s,c)=>{if(!s||!c)return s;for(const u of["action","expression","attire","accessories","appearance","label","age","body","sex","original","original_tag","negative"]){const d=l(s[u]||"",2e3),f=l(c[u]||"",2e3);f&&(d?d.toLowerCase().includes(f.toLowerCase())||(s[u]=N(d,f)):s[u]=f)}return s};for(const s of e||[]){if(!s||typeof s!="object")continue;const c=l(s.name,200);if(!c)continue;const u=_e(c,t),d=u?`id:${l(u.id||u.name,200)}`:`name:${z(c)}`;if(!d||d==="id:"||d==="name:")continue;const f=a.findIndex(p=>p._dedupeKey===d);if(f>=0){o(a[f],s);continue}a.length>=r||(i.add(d),a.push({...s,name:u?.name||c,_dedupeKey:d}))}return a.map(({_dedupeKey:s,...c})=>c)}function Mn(e){const t=new Set;for(const r of cr(e)){const a=z(r);a&&t.add(a)}const n=z(e?.name);return n&&t.add(n),t}function oa(e){return Rl(e||[]).active}function Dl(e,t){const n=l(e).toLowerCase(),r=_t(e);if(!n)return[];const a=[],i=new Set;for(const o of t||[]){const s=l(o.id||o.name,200);if(!(!s||i.has(s)))for(const c of cr(o)){const u=z(c),d=_t(c);if(!(d.length<2)&&(n.includes(u)||r.includes(d))){a.push(o),i.add(s);break}}}return a}function Kt(e,t=""){if(typeof e!="object"||e===null)return null;const n=e,r=l(n.name||t,200);if(!r)return null;let a=V(n.aliases);a=[r,...a.filter(f=>z(f)!==z(r))];const i=l(n.original||n.original_tag||n.copyright||"",400);let o=l(n.appearance||"",4e3),s=l(n.attire||"",4e3),c=l(n.accessories||"",4e3);const u=l(n.tags||"",4e3);u&&!o&&!s&&!c&&(o=u),i&&o&&(o=N(...o.split(",").filter(f=>z(f)!==z(i))));let d=l(n.id,80)||r.replace(/[^a-zA-Z0-9_\uac00-\ud7a3]+/g,"_").replace(/^_|_$/g,"").slice(0,64);return d||(d=`char_${Math.abs(dl(r))%1e7}`),je({...n,id:d,name:r,aliases:a,original:i,appearance:o,attire:s,accessories:c,gender:Jt(n.gender??n.sex)})}function Fl(e,t,n={}){const r=Array.isArray(e)?e:[],a=Array.isArray(t)?t:[],i=typeof n.hasAppearance=="function"?n.hasAppearance:()=>!1,o=typeof n.resolve=="function"?n.resolve:()=>null,s=typeof n.aliasKeys=="function"?n.aliasKeys:()=>new Set,c=typeof n.normalizeName=="function"?n.normalizeName:p=>String(p||"").trim().toLowerCase(),u=typeof n.clean=="function"?n.clean:p=>String(p||"").trim(),d=[],f=new Set;for(const p of r){if(!u(p?.name,200)||i(p))continue;const m=o(p.name,a);if(m&&i(m))continue;for(const h of s(p))f.add(h);const g=c(p.name);g&&f.add(g)}for(const p of a)[...s(p)].some(m=>f.has(m))||d.push(p);for(const p of r){const m=o(p.name,d);if(!(m&&i(p))){if(m&&!i(p)){if(i(m))continue;const g=d.findIndex(h=>o(p.name,[h]));g>=0?d[g]=p:d.push(p);continue}m||d.push(p)}}return d}var Gt=C((()=>{F(),aa()}));function sa(e){const t=l(e).toLowerCase();return t?dr(t,Po):!1}function ca(e){const t=l(e).toLowerCase();return!t||sa(t)?!1:dr(t,Oo)}function zl(e){return sa(e)||ca(e)}function Ul(e){const t=l(e).toLowerCase();return!t||zl(t)?!1:dr(t,To)}function Jl(e){const t=[],n=[],r=[];for(const a of l(e).split(",")){const i=a.trim();i&&(sa(i)?r.push(i):ca(i)||Ul(i)?n.push(i):t.push(i))}return[N(...t),N(...n),N(...r)]}function Kl(e){const t=[];for(const n of l(e).split(",")){const r=n.trim();r&&ca(r)&&t.push(r)}return N(...t)}function jo(e){if(e===!0||e===1)return!0;const t=l(e,20).toLowerCase();return t==="true"||t==="on"||t==="1"}function Gl(e){const[t,n]=Jl(e);return[t,n]}function Hl(...e){const t=[];for(const n of e)if(n!=null)for(const r of l(n).split(",")){let a=r.trim().toLowerCase();if(!a)continue;const i=a.match(/^\d+(?:\.\d+)?::(.+)::$/);i&&(a=i[1].trim().toLowerCase()),a=a.replace(/_/g," ").trim(),a&&t.push(a)}return t}function ql(...e){const t=Hl(...e);if(!t.length)return null;let n=0,r=0;for(const a of t)(Bo.has(a)||/^\d+\+?girls?$/.test(a))&&(n+=1),(Ro.has(a)||/^\d+\+?boys?$/.test(a))&&(r+=1);return n>r?"f":r>n?"m":null}function lr(e,t){const n=Jt(e?.gender??t?.gender??t?.sex);return n==="girl"?"f":n==="boy"?"m":n==="other"?null:ql(t?.appearance,t?.attire,t?.accessories,e?.appearance,e?.attire,e?.accessories,e?.label,e?.age,e?.body,e?.prompt,e?.sex)}function ur(e,t,n,r){return e<=0?"":e===1?t:e<=5?`${e}${n}`:r}function Wl(e,t){const n=[],r=ur(e,"1girl","girls","6+girls"),a=ur(t,"1boy","boys","6+boys");return r&&n.push(r),a&&n.push(a),n.join(", ")}function $o(e){const t=l(e);if(!t)return"";const n=[];for(const r of Pi(t)){const a=r.trim();a&&(ua.test(a)||Do.test(a)||Fo.test(a)||n.push(a))}return N(...n)}function la(e){const t=[],n=new Set;for(const r of l(e).split(",")){let a=r.trim();if(!a)continue;if(ua.test(a)){const o=a.toLowerCase();if(o.includes("girl"))a="girl";else if(o.includes("boy"))a="boy";else continue}const i=a.toLowerCase();n.has(i)||(n.add(i),t.push(a))}return N(...t)}function Vl(e){const t=Number(e);return Number.isFinite(t)?Math.max(0,Math.min(5,Math.round(t))):3}function Yl(e,t=3){const n=l(e,200);if(!n)return"";const r=Vl(t);return r<=0?n:`${r}::${n}::`}function Co(e,t=null){let n=e;if(n==null&&t!=null&&(n=t),n===!1)return"off";if(n===!0)return"gender";const r=l(n,40).toLowerCase();return["","auto","mixed","true","1","on"].includes(r)?"gender":["off","none","false","0","disable","disabled"].includes(r)?"off":["girl","all_girls","girls_only"].includes(r)?"girls":["person","persons"].includes(r)?"people":zo(r)?r:"gender"}function Zl(e,t,n="gender",r=null){const a=Co(n,r);if(a==="off")return"";const i=(e||[]).slice(0,6),o=i.length;if(o<=0)return"";if(a==="girls")return ur(o,"1girl","girls","6+girls");if(a==="people")return ur(o,"1person","people","6+people");let s=0,c=0,u=0;for(const d of i){const f=l(d.name,200),p=f?_e(f,t):null,m=lr(d,p);m==="f"?s++:m==="m"?c++:Jt(d.gender??p?.gender)==="other"||u++}return s+=u,Wl(s,c)}function Nn(e){return N(e?.original||"",e?.appearance||"",e?.attire||"",e?.accessories||"")}function ke(e){if(typeof e!="object"||e===null)return!1;const t=e;let n=l(t.appearance||"",4e3);if(!n)return!1;const r=l(t.original||"",400);r&&(n=N(...n.split(",").filter(o=>z(o)!==z(r))));const[a]=Gl(n);if(n=l(a||"",4e3),!n)return!1;const i=new Set(["girl","boy","man","woman","male","female","1girl","1boy","2girls","2boys","solo","other"]);return n.split(",").map(o=>o.trim().toLowerCase()).filter(Boolean).filter(o=>!i.has(o)&&!/^\d+(girl|boy)s?$/.test(o)).length>0}function ie(e){return e!==!1}function Xl(e,t){const n=ke(e),r=l(t?.original||t?.original_tag||"",400),a=l(e?.original||"",400),i=l(e?.attire||"",4e3),o=l(e?.accessories||"",4e3),s=l(t?.attire||"",4e3),c=l(t?.accessories||"",4e3),u=ie(e?.attire_locked)?i:s||i,d=ie(e?.accessories_locked)?o:c||o,f=jo(t?.nude),p=jo(t?.weapon),m=f?N("nude",Kl(u)):u,g=p?d:"";return la(n?N(a||r,e?.appearance,m,g,t?.expression,t?.action,t?.sex):N(a?"":r,t?.label,t?.age,t?.appearance,t?.body,m,g,t?.expression,t?.action,t?.sex))}function nt(e){const t=typeof e=="object"&&e?e:{},n=L(t.character_max??t.char_max??6,6);return Math.max(1,Math.min(6,n))}var To,Oo,Po,Lo,Bo,Ro,ua,Do,da,Fo,zo,dr,rt=C((()=>{jl(),$l(),Cl(),F(),aa(),Gt(),To=Ao,Oo=Mo,Po=No,Lo=["off","girls","people","gender"],Bo=new Set(["girl","woman","female"]),Ro=new Set(["boy","man","male"]),ua=/^\d+\+?(?:girls?|boys?|people|person)$/i,Do=/^(?:1girl|1boy)$/i,da="(?:\\d+\\+?(?:girls?|boys?|people|person)|1girl|1boy|solo)",Fo=new RegExp(`^-?\\d+(?:\\.\\d+)?::\\s*${da}(?:\\s*,\\s*${da})*\\s*::$`,"i"),zo=e=>Lo.includes(e),dr=(e,t)=>t.some(n=>{if(n.length<=3){const r=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return new RegExp(`(?:^|[^a-z0-9])${r}(?:[^a-z0-9]|$)`,"i").test(e)}return e.includes(n)})}));ce(),vo(),he(),rt(),F();function Ql(e,t,n,r){let a=l(e);if(!a)return"";for(const s of r){const c=l(s);if(c)if(a.endsWith(c))a=a.slice(0,a.length-c.length).replace(/[,\s]+$/g,"");else{const u=a.lastIndexOf(c);u>=0&&(a=`${a.slice(0,u)}${a.slice(u+c.length)}`.replace(/,\s*,/g,",").replace(/^[,\s]+|[,\s]+$/g,""))}}const i=l(t);if(i)if(a.startsWith(i))a=a.slice(i.length).replace(/^[,\s]+/g,"");else{const s=a.indexOf(i);s>=0&&(a=`${a.slice(0,s)}${a.slice(s+i.length)}`.replace(/,\s*,/g,",").replace(/^[,\s]+|[,\s]+$/g,""))}const o=[...n].map(s=>l(s)).filter(Boolean).sort((s,c)=>c.length-s.length);for(const s of o){const c=a.indexOf(s);c<0||(a=`${a.slice(0,c)}${a.slice(c+s.length)}`.replace(/,\s*,/g,",").replace(/^[,\s]+|[,\s]+$/g,""))}return l(a)}function eu(e){const t=l(e.setup),n=l(e.main);if(!n)return{lockedSetup:t,rebuildMain:!0};if(t&&t!==n)return{lockedSetup:t,rebuildMain:!0};const r=l(e.person);if(r||e.stylePositives&&e.stylePositives.length){const a=Ql(n,r,e.stylePositives||[],e.qualitySuffixes||[]);if(a&&a!==n)return{lockedSetup:a,rebuildMain:!0}}return{lockedSetup:"",rebuildMain:!1}}function tu(e){if(!e||typeof e!="object")return[];const t=[],n=l(e.custom_pos);n&&t.push(n);const r=Array.isArray(e.presets)?e.presets:[];for(const a of r){if(!a||typeof a!="object")continue;const i=a,o=l(i.positive||i.pos);o&&t.push(o)}return t}async function Uo(e,t,n){const r=new Blob([e],{type:t});let a=null;if(typeof createImageBitmap=="function"?a=await createImageBitmap(r):n&&typeof document<"u"&&(a=await new Promise((s,c)=>{const u=new Image,d=URL.createObjectURL(r);u.onload=()=>{URL.revokeObjectURL(d),s(u)},u.onerror=()=>{URL.revokeObjectURL(d),c(new Error("image decode failed"))},u.src=d})),!a)return null;const i=a,o="naturalWidth"in i?{w:i.naturalWidth,h:i.naturalHeight}:{w:0,h:0};return{source:i,width:i.width||o.w||0,height:i.height||o.h||0,close:()=>{try{"close"in i&&i.close()}catch{}}}}function Jo(e,t,n,r){if(r&&typeof OffscreenCanvas<"u"){const a=new OffscreenCanvas(t,n),i=a.getContext("2d");return i?(i.drawImage(e.source,0,0,t,n),{kind:"offscreen",canvas:a}):null}if(typeof document<"u"){const a=document.createElement("canvas");a.width=t,a.height=n;const i=a.getContext("2d");return i?(i.drawImage(e.source,0,0,t,n),{kind:"dom",canvas:a}):null}return null}async function nu(e,t=.8){const n=pe(e);if(!n.length)return null;if(Hr(n))return Q(n);const r=xn(n);try{const a=await Uo(n,r,!0);if(!a)return null;if(!(a.width>0&&a.height>0))return a.close(),null;const i=Jo(a,a.width,a.height,!0);if(!i)return a.close(),null;let o;if(i.kind==="offscreen"){const c=await i.canvas.convertToBlob({type:"image/webp",quality:t});if(a.close(),!c||!c.size)return null;o=await c.arrayBuffer()}else o=ul(i.canvas.toDataURL("image/webp",t)),a.close();if(!o)return null;const s=pe(o);return!Hr(s)||s.length>=n.length*.98?null:o}catch(a){return w("image.webp.encode.fail",{message:String(a?.message||a)},"warn"),null}}async function ru(e){let t=pe(e);if(!t.length)throw new Error("image is empty");const n=1536,r=12e5,a=xn(t),i=t.length>r;try{const o=await Uo(t,a,!1);if(o&&(i||o.width>n||o.height>n)){const s=Math.min(1,n/Math.max(o.width,o.height,1)),c=Jo(o,Math.max(1,Math.round(o.width*s)),Math.max(1,Math.round(o.height*s)),!1);if(c?.kind==="dom"){const u=await new Promise(d=>{c.canvas.toBlob(d,"image/png")});if(u)return t=new Uint8Array(await u.arrayBuffer()),o.close(),{bytes:t,mime:"image/png",filename:"image.png"}}}o?.close()}catch(o){w("autotag.resize",{message:String(o?.message||o)},"warn")}return{bytes:t,mime:a,filename:`image.${a==="image/jpeg"?"jpg":a==="image/webp"?"webp":"png"}`}}async function fr(){return Ht||(Ht=(async()=>{const e=Rt();if(typeof e?.getLocalPluginStorage=="function")try{const n=se("storage.open"),r=await e.getLocalPluginStorage();if(fa(r))return n.end({message:"idb/getLocalPluginStorage"}),{kind:"idb",api:r};n.end({message:"getLocalPluginStorage returned unusable api"},"warn")}catch(n){w("storage.open",{message:String(n?.message||n)},"error"),console.warn("[Inlay Nexus] getLocalPluginStorage failed",n?.message||n)}const t=e?.pluginStorage;if(fa(t))return w("storage.open",{message:"fallback pluginStorage (save-file)"},"warn"),console.warn("[Inlay Nexus] falling back to pluginStorage (save-file scoped)"),{kind:"plugin",api:t};throw w("storage.open",{message:"no storage API"},"error"),new Error("기기 로컬 IndexedDB 저장소(getLocalPluginStorage)를 사용할 수 없습니다.")})().catch(e=>{throw Ht=null,e}),Ht)}function au(){return Rt()?.pluginStorage??null}async function Se(e,t){try{const{kind:n,api:r}=await fr(),a=await r.getItem(e);if(a!=null&&a!=="")return a;if(n==="idb"&&t){const i=au();if(i?.getItem)try{const o=await i.getItem(t);if(o!=null&&o!=="")return await r.setItem(e,o),o}catch{}}return null}catch{return null}}function iu(e){if(typeof e=="string")return e.length;try{return JSON.stringify(e).length}catch{return 0}}async function Ae(e,t){const{kind:n,api:r}=await fr(),a=iu(t),i=a>5e4?se("storage.set.large"):null;try{return await r.setItem(e,t),i?i.end({message:e,bytes:a,kind:n,background:!0}):a>8e3&&w("storage.set",{message:e,bytes:a,kind:n,background:!0}),!0}catch(o){throw i?i.fail(o,{message:e,bytes:a,kind:n,background:!0}):w("storage.set",{message:`${e}: ${o?.message||o}`,bytes:a,kind:n,background:!0},"error"),o}}async function le(e){try{const{api:t}=await fr();t?.removeItem&&await t.removeItem(e)}catch{}}var fa,Ht,mr=C((()=>{W(),Dt(),fa=e=>typeof e?.getItem=="function"&&typeof e?.setItem=="function",Ht=null})),Ko,Go,qt,ou=C((()=>{Ko=class{budgetChars;urls=new Map;pinned=new Set;bytes=0;constructor(e){this.budgetChars=e}get size(){return this.urls.size}get byteLength(){return this.bytes}get(e){const t=String(e||"");if(!t)return;const n=this.urls.get(t);if(n!==void 0)return this.urls.delete(t),this.urls.set(t,n),n}set(e,t){const n=String(e||"");if(!n||typeof t!="string"||!t)return;const r=this.urls.get(n);r!==void 0&&(this.bytes-=r.length),this.urls.delete(n),this.urls.set(n,t),this.bytes+=t.length,this.evict()}drop(e){const t=String(e||""),n=this.urls.get(t);n!==void 0&&(this.urls.delete(t),this.bytes-=n.length,this.pinned.delete(t))}pin(e){this.pinned.clear();for(const t of e){const n=String(t||"");if(!n)continue;this.pinned.add(n);const r=this.urls.get(n);r!==void 0&&(this.urls.delete(n),this.urls.set(n,r))}this.evict()}pinnedIds(){return[...this.pinned]}clear(){this.urls.clear(),this.pinned.clear(),this.bytes=0}evict(){if(!(this.bytes<=this.budgetChars))for(const[e,t]of this.urls){if(this.bytes<=this.budgetChars)break;this.pinned.has(e)||(this.urls.delete(e),this.bytes-=t.length)}}},Go=33554432,qt=new Ko(Go)}));function Ho(e){const t=String(e.session_id??"");if(!t)return;let n=Wt.get(t);n||(n=new Set,Wt.set(t,n)),n.add(String(e.id))}function qo(e){if(!e)return;const t=String(e.session_id??""),n=t?Wt.get(t):void 0;n&&(n.delete(String(e.id)),n.size===0&&Wt.delete(t))}function Wo(e,t){if(e==="characters"){if(Array.isArray(t))return`${t[0]}	${t[1]}`;if(t&&typeof t=="object"){const n=t;return`${n.scope}	${n.id}`}}return String(t)}function su(e,t){if(!t||typeof t!="object")return"";const n=t;return e==="meta"?String(n.key||""):e==="characters"?`${n.scope}	${n.id}`:String(n.id||"")}function cu(e){if(!e||typeof e!="object")return e;const t={...e};if(!t.result_json)return t;try{const n=JSON.parse(t.result_json);if(!n||typeof n!="object")return t;const r={...n};delete r.tagged,delete r.appearance,delete r.debug_tail,Array.isArray(r.cards)&&(r.cards=r.cards.map(a=>{if(!a||typeof a!="object")return a;const i={...a};return typeof i.image_url=="string"&&i.image_url.startsWith("data:")&&(i.image_url=""),i})),t.result_json=JSON.stringify(r)}catch{}return t}function lu(e){const t={};if(e==="images"){for(const[n,r]of B.images)t[n]={id:r.id,location:r.location||null,has_png:r.has_png,png_bytes:r.png_bytes,storage:"indexeddb",storage_key:Ie(n)};return t}for(const[n,r]of B[e]){const a=r;if(e==="meta"&&a?.key==="reference_image"){t[n]={key:"reference_image",has_png:!!a.png,updated_at:a.updated_at||0};continue}if(e==="meta"&&a?.key==="vibe_transfer"){t[n]={key:"vibe_transfer",has_png:!!a.png,has_encoded:!!a.encoded,model:a.model||"",information_extracted:a.information_extracted??1,updated_at:a.updated_at||0};continue}if(e==="meta"&&Bt(a?.key)){t[n]={key:a.key,has_png:!!a.png,has_encoded:!!a.encoded,model:a.model||"",information_extracted:a.information_extracted??1,updated_at:a.updated_at||0};continue}if(e==="jobs"){t[n]=cu(a);continue}t[n]=r}return t}async function uu(e){await Ae(zr(e),lu(e))}function Vo(){kt=null;const e=[...jn];jn.clear(),e.length&&(pr=pr.then(async()=>{for(const t of e){if(ts){w("storage.persist.skip",{message:t,background:!0});continue}try{await uu(t)}catch(n){console.warn("[Inlay Nexus] persist failed",t,n?.message||n)}}}).catch(()=>{}))}function vt(e){jn.add(e),!kt&&(kt=setTimeout(Vo,es))}async function Yo(){kt&&(clearTimeout(kt),Vo()),await pr,await oe}function du(){const e=globalThis.document;if(!e?.addEventListener)return;const t=()=>{!kt&&!jn.size||Yo()};e.addEventListener("visibilitychange",()=>{e.visibilityState==="hidden"&&t()}),globalThis.addEventListener?.("pagehide",t)}function fu(e,t){B.images.delete(e),B.images.set(e,t)}function Zo(e){if(St+=e,!(St<=ma))for(const t of B.images.values()){if(St<=ma)break;!t.png||!t.durable||(St-=t.png.byteLength,t.png=null,t.hydrated=!1)}}async function mu(e,t){if(t.hydrated)return t.png;const n=gr.get(e);if(n)return n;const r=(async()=>{const a=$n(await Se(Ie(e),xi(e)));return t.png=a,t.hydrated=!0,t.durable=!0,a?(t.png_bytes=a.byteLength,Zo(a.byteLength)):(t.has_png=!1,t.png_bytes=0),a})().finally(()=>gr.delete(e));return gr.set(e,r),r}async function at(){return Vt||(Vt=(async()=>{for(const e of Mi){const t=await Se(zr(e),vi(e));if(t==null||t==="")continue;let n=t;if(typeof t=="string")try{n=JSON.parse(t)}catch{continue}if(!(!n||typeof n!="object"))for(const[r,a]of Object.entries(n)){const i=a??{};if(e==="images"){const o=!!i.has_png;B.images.set(r,{id:String(i.id||r),location:i.location||{},png:null,has_png:o,png_bytes:Number(i.png_bytes)||0,hydrated:!o,durable:!0})}else if(e==="meta"&&(i.key==="reference_image"||r==="reference_image")){const o=$n(await Se(ln,ki));B.meta.set("reference_image",{key:"reference_image",png:o})}else if(e==="meta"&&(i.key==="vibe_transfer"||r==="vibe_transfer")){const o=$n(await Se(un));let s=await Se(dn);if(typeof s=="string")try{s=JSON.parse(s)}catch{s=null}const c=s??{};B.meta.set("vibe_transfer",{key:"vibe_transfer",png:o,encoded:c.encoded||"",model:c.model||i.model||"",information_extracted:c.information_extracted??i.information_extracted??1})}else if(e==="meta"&&Bt(i.key||r)){const o=String(i.key||r),s=pn(o),c=$n(await Se(fn(s)));let u=await Se(mn(s));if(typeof u=="string")try{u=JSON.parse(u)}catch{u=null}const d=u??{};B.meta.set(o,{key:o,png:c,encoded:d.encoded||"",model:d.model||i.model||"",information_extracted:d.information_extracted??i.information_extracted??1})}else if(e==="cards"){const o=i;B.cards.set(r,o),Ho(o)}else B[e].set(r,i)}}return!0})().catch(e=>{throw Vt=null,e}),Vt)}async function D(e,t){await at();const n=Wo(e,t);if(e==="images"){const a=B.images.get(n);return a?(a.hydrated?a.png&&fu(n,a):await mu(n,a),a):void 0}const r=B[e].get(n);return r??void 0}async function pu(e){await at();const t=B.images.get(String(e));if(t)return{has_png:t.has_png,png_bytes:t.png_bytes}}async function R(e,t,n={}){await at();const r=su(e,t);if(!r)throw new Error(`invalid ${e} key`);const a=n.persist!==!1;if(e==="images"){const i=t.png||null,o=B.images.get(r);o?.png&&(St-=o.png.byteLength);const s={id:String(t.id),location:t.location||{},...typeof t.mime=="string"&&t.mime?{mime:t.mime}:{},png:i,has_png:!!i,png_bytes:i?i.byteLength:0,hydrated:!0,durable:!i};return B.images.set(r,s),i?(Zo(i.byteLength),oe=oe.then(async()=>{const c=await Ze(new Uint8Array(i));await Ae(Ie(r),c),B.images.get(r)===s&&(s.durable=!0)}).catch(c=>console.warn("[Inlay Nexus] image persist failed",r,c?.message||c))):oe=oe.then(()=>le(Ie(r))).catch(()=>{}),a&&vt("images"),r}if(e==="meta"&&t.key==="reference_image"){const i=t.png||null;return B.meta.set("reference_image",{key:"reference_image",png:i}),i?oe=oe.then(async()=>{await Ae(ln,await Ze(new Uint8Array(i)))}).catch(o=>console.warn("[Inlay Nexus] ref persist failed",o?.message||o)):oe=oe.then(()=>le(ln)).catch(()=>{}),a&&vt("meta"),"reference_image"}if(e==="meta"&&t.key==="vibe_transfer"){const i={key:"vibe_transfer",png:t.png||null,encoded:t.encoded||"",model:t.model||"",information_extracted:t.information_extracted??1};return B.meta.set("vibe_transfer",i),oe=oe.then(async()=>{i.png?await Ae(un,await Ze(new Uint8Array(i.png))):await le(un),i.encoded?await Ae(dn,{encoded:i.encoded,model:i.model,information_extracted:i.information_extracted}):await le(dn)}).catch(o=>console.warn("[Inlay Nexus] vibe persist failed",o?.message||o)),a&&vt("meta"),"vibe_transfer"}if(e==="meta"&&Bt(t.key)){const i=String(t.key),o=pn(i),s={key:i,png:t.png||null,encoded:t.encoded||"",model:t.model||"",information_extracted:t.information_extracted??1};return B.meta.set(i,s),oe=oe.then(async()=>{s.png?await Ae(fn(o),await Ze(new Uint8Array(s.png))):await le(fn(o)),s.encoded?await Ae(mn(o),{encoded:s.encoded,model:s.model,information_extracted:s.information_extracted}):await le(mn(o))}).catch(c=>console.warn("[Inlay Nexus] preset vibe persist failed",c?.message||c)),a&&vt("meta"),i}if(e==="cards"){qo(B.cards.get(r));const i=t;return B.cards.set(r,i),Ho(i),a&&vt("cards"),r}return B[e].set(r,t),a&&vt(e),r}async function xt(e,t){await at();const n=Wo(e,t);if(e==="cards"&&qo(B.cards.get(n)),e==="images"){const r=B.images.get(n);r?.png&&(St-=r.png.byteLength)}if(B[e].delete(n),e==="images"&&await le(Ie(n)),e==="meta"&&n==="reference_image"&&await le(ln),e==="meta"&&n==="vibe_transfer"&&(await le(un),await le(dn)),e==="meta"&&Bt(n)){const r=pn(n);await le(fn(r)),await le(mn(r))}return vt(e),e==="images"&&Qo(n),!0}async function ye(e){return await at(),[...B[e].values()]}async function Xo(e){await at();const t=Wt.get(String(e));if(!t)return[];const n=[];for(const r of t){const a=B.cards.get(r);a&&n.push(a)}return n}function In(e){return B[e].size}function gu(){let e=0;for(const t of B.images.values())e+=t.png_bytes;return e}function hu(){const e=[];for(const t of B.images.values())e.push(t.location||{});return e}async function _u(e){await at();const t=B.images.get(String(e))?.location;return t&&typeof t=="object"?t:{}}function En(e){return qt.get(String(e))}function yu(e,t){qt.set(String(e),t)}function Qo(e){qt.drop(String(e))}function bu(e){qt.pin(e)}function wu(){return qt.size}async function vu(e){return(await D("images",String(e)))?.png??null}var B,Wt,es,jn,kt,pr,oe,ts,ma,St,gr,$n,Vt,$e=C((()=>{X(),W(),ce(),mr(),ou(),B={meta:new Map,cards:new Map,characters:new Map,jobs:new Map,images:new Map},Wt=new Map,es=25,jn=new Set,kt=null,pr=Promise.resolve(),oe=Promise.resolve(),ts=!1,du(),ma=100663296,St=0,gr=new Map,$n=e=>typeof e=="string"&&e?ll(e):null,Vt=null}));W(),ce(),gt(),$e();async function Yt(e){if(!e)return"";const t=En(e);if(t!==void 0)return t;const n=se("image.data_url"),r=await D("images",e);if(!r?.png)return n.end({message:`missing png ${e}`,id:e,background:!0},"warn"),"";const a=typeof r.mime=="string"&&r.mime||xn(r.png),i=`data:${a};base64,${await cl(r.png)}`;return yu(e,i),n.end({message:e,bytes:r.png.byteLength||0,mime:a,url_len:i.length,focus:!0}),i}function Ce(e){const t=typeof e=="string"?e:e?.id;return t&&En(String(t))||""}async function pa(e,t,n=null){const r=se("image.publish");Qo(e);let a=t,i=xn(t);try{const s=await nu(t,.8);s&&(a=s,i="image/webp")}catch(s){w("image.webp",{message:String(s?.message||s),id:e},"warn")}await R("images",{id:e,png:a,mime:i,location:n||{}});let o="";try{const s=Yt(e);o=await Promise.race([s,Ye(5e3).then(()=>Ce(e)||"")]),o||(w("image.data_url.defer",{message:e,bytes:a?.byteLength||0,mime:i,focus:!0},"warn"),s.catch(c=>console.warn("[Inlay Nexus] deferred data URL failed",c?.message||c)))}catch(s){w("image.data_url",{message:String(s?.message||s),id:e},"warn"),Promise.resolve().then(()=>Yt(e)).catch(()=>{})}return r.end({message:e,bytes:a?.byteLength||0,src_bytes:t?.byteLength||0,mime:i,has_url:!!o,has_location:!!(n&&Object.keys(n).length),focus:!0}),o}var ga=2,Zt=new Set,be=[],De=0,Te=0,Fe=0,ns=null;function xu(){const e=be.length+De,t=Math.max(Te,Fe+e),n=Math.min(Fe,t),r=t>0?Math.max(0,Math.min(100,Math.round(n/t*100))):0;return{pending:e,active:De,done:n,total:t,pct:r,busy:e>0}}function ku(e){ns=typeof e=="function"?e:null}function At(){try{ns?.()}catch{}}function ha(){for(;De<ga&&be.length;){const e=be.shift();De+=1,At(),Yt(e).catch(()=>{}).finally(()=>{De-=1,Zt.delete(e),Fe+=1,be.length===0&&De===0&&(Te=0,Fe=0),At(),ha()})}}function Su(e){const t=String(e||"");!t||En(t)!==void 0||Zt.has(t)||(Zt.add(t),be.push(t),Te+=1,At(),ha())}function Au(e=[]){const t=[...new Set((e||[]).map(String).filter(Boolean))];if(bu(t),!t.length)return;const n=new Set(t),r=be.length,a=[];for(const c of be)n.has(c)?a.push(c):Zt.delete(c);be.length=0;const i=[];for(const c of t)En(c)===void 0&&(Zt.has(c)||(Zt.add(c),Te+=1),i.includes(c)||i.push(c));const o=a.filter(c=>!i.includes(c));be.push(...i,...o);const s=r-a.length;s>0&&(Te=Math.max(Fe+be.length+De,Te-s)),At(),ha()}async function Mu(e=[],{concurrency:t=ga}={}){const n=[...new Set((e||[]).map(String).filter(Boolean))],r=Math.max(1,Number(t)||ga),a=n.filter(i=>En(i)===void 0);a.length&&(Te+=a.length,At());for(let i=0;i<a.length;i+=r){const o=a.slice(i,i+r);await Promise.all(o.map(s=>Yt(s).catch(()=>"").finally(()=>{Fe+=1,be.length===0&&De===0&&Fe>=Te&&(Te=0,Fe=0),At()})))}return be.length===0&&De===0&&(Te=0,Fe=0,At()),n.map(i=>Ce(i)).filter(Boolean)}async function it(e,t={}){if(!e||typeof e!="object")return e;if(Array.isArray(e)){for(let r=0;r<e.length;r+=1)e[r]=await it(e[r],t);return e}const n=e;if(typeof n.id=="string"&&(typeof n.image_url=="string"||n.image_path!=null||"shot_index"in n||"main_prompt"in n)){const r=String(n.id),a=t.ids!=null?new Set([...t.ids].map(String)):null;if(!t.cachedOnly&&(!a||a.has(r))){const i=await Yt(r);i&&(n.image_url=i)}else n.image_url=Ce(r)||"",n.image_url||Su(r);return e}for(const r of Object.keys(n))n[r]&&typeof n[r]=="object"&&(n[r]=await it(n[r],t));return e}function Mt(e){return e?`data:${xn(e)};base64,${sl(e)}`:""}X(),F(),aa(),Gt(),$e();var Oe=(e,t)=>!!e&&Object.prototype.hasOwnProperty.call(e,t),hr=e=>e?[...e]:[],_a=e=>e;async function ne(e){const t=(await ye("characters")).filter(r=>r.scope===l(e,200)).sort((r,a)=>(r.name||"").localeCompare(a.name||"",void 0,{sensitivity:"base"})),n=[];for(const r of t){let a=r.aliases;if(typeof a=="string")try{a=JSON.parse(a)}catch{a=V(a)}const i=r.appearance||"",o=r.attire||"",s=r.accessories||"";let c=Jt(r.gender??r.sex);if(!c){const d=Tl(i,o,s);d&&(c=d,await R("characters",{...r,gender:d,schema_version:Math.max(2,Number(r.schema_version||1)),updated_at:Date.now()/1e3}))}const u={id:r.id,name:r.name,aliases:Array.isArray(a)?a:V(a),surname:r.surname||"",given_name:r.given_name||"",surname_variants:V(r.surname_variants),given_name_variants:V(r.given_name_variants),priority:Number(r.priority||0),attire_locked:ie(r.attire_locked),accessories_locked:ie(r.accessories_locked),schema_version:Number(r.schema_version||1),original:r.original||"",appearance:i,attire:o,accessories:s,gender:c,updated_at:r.updated_at,scope:r.scope};u.tags=Nn(u),n.push(u)}return n}async function Nu(e){const t=l(e,200);return t?(await ye("meta")).filter(n=>n.key?.startsWith(`toggle:${t}:`)&&n.enabled===0).map(n=>l(n.global_key||n.key.split(":").slice(2).join(":"),200)).filter(Boolean):[]}async function Iu(e,t){const n=l(e,200);if(!n)return{ok:!1,error:{code:"bad_request",message:"character_id required"}};const r=[],a=new Set;for(const s of t||[]){const c=l(s,200);!c||a.has(c)||(a.add(c),r.push(c))}const i=await ye("meta");for(const s of i)s.key?.startsWith(`toggle:${n}:`)&&await xt("meta",s.key);const o=Date.now()/1e3;for(const s of r)await R("meta",{key:`toggle:${n}:${s}`,character_id:n,global_key:s,enabled:0,updated_at:o});return{ok:!0,character_id:n,disabled_globals:r}}function rs(e){const t=[];for(const n of[e.id,e.name]){const r=l(n,200);if(!r)continue;t.push(r);const a=r.toLowerCase();a!==r&&t.push(a)}return[...new Set(t)]}function ya(e,t){if(!t?.size)return!1;for(const n of rs(e))if(t.has(n))return!0;return!1}async function ba(e){const t=await Nu(e);return new Set(t)}async function Eu(e){const t=await ba(e),n={};for(const r of await ne(Ve)){const a=!ya(r,t);for(const i of rs(r))n[i]=a;n[l(r.name,200)]=a}return n}async function ju(e=[]){const t=[],n=new Set;for(const r of e||[]){const a=l(r,200);!a||a==="__global__"||n.has(a)||(n.add(a),t.push(...await ne(a)))}return _a(oa(t))}async function wa(e,t="",n="",r=[]){const a=!!$()?.card?.unified_chat_priority,i=(Array.isArray(r)?r:[]).map(d=>l(d,200)).filter(Boolean);let o;a&&i.length?o=await ju(i):o=await ne(l(e||"",200));const s=l(n||"",200),c=s?await ba(s):new Set,u=(await ne(Ve)).filter(d=>!ya(d,c));return _a(Fl(o,u,{hasAppearance:ke,resolve:_e,aliasKeys:Mn,normalizeName:z,fullTags:Nn,clean:l,globalScope:Ve}))}async function ot(e,t){const n=Oe(t,"appearance"),r=Oe(t,"attire"),a=Oe(t,"accessories"),i=Oe(t,"original"),o=Oe(t,"surname"),s=Oe(t,"given_name"),c=Oe(t,"surname_variants"),u=Oe(t,"given_name_variants");let d=Kt(t);if(!d)return null;const f=l(e,200)||"__global__",p=await ne(f),m=l(d.id,80),g=d,h=p.find(y=>m&&l(y.id,80)===m?!1:!!(_e(g.name,[y])||(g.aliases||[]).some(v=>_e(v,[y]))));if(h){const y=V([...h.aliases||[],...d.aliases||[],d.name,h.name]),v=l(d.appearance||"",4e3),x=l(d.attire||"",4e3),A=l(d.accessories||"",4e3),O=l(d.original||"",400),E=l(d.surname||"",200),M=l(d.given_name||"",200);if(d=Kt({...h,...d,id:h.id,name:h.name||d.name,aliases:y,original:i?O:O||h.original||"",appearance:n?v:v||h.appearance||"",attire:r?x:x||h.attire||"",accessories:a?A:A||h.accessories||"",surname:o?E:E||h.surname||"",given_name:s?M:M||h.given_name||"",surname_variants:V(c?[...d.surname_variants||[],E]:[...h.surname_variants||[],...d.surname_variants||[],E,h.surname]),given_name_variants:V(u?[...d.given_name_variants||[],M]:[...h.given_name_variants||[],...d.given_name_variants||[],M,h.given_name]),attire_locked:Oe(t,"attire_locked")?ie(d.attire_locked):ie(h.attire_locked),accessories_locked:Oe(t,"accessories_locked")?ie(d.accessories_locked):ie(h.accessories_locked),priority:Math.max(Number(h.priority||0),Number(d.priority||0))}),!d)return null}const _=Date.now()/1e3;if(await R("characters",{scope:f,id:d.id,name:d.name,aliases:d.aliases,surname:d.surname||"",given_name:d.given_name||"",surname_variants:d.surname_variants||[],given_name_variants:d.given_name_variants||[],priority:Number(d.priority||0),attire_locked:ie(d.attire_locked),accessories_locked:ie(d.accessories_locked),schema_version:2,appearance:d.appearance,attire:d.attire,accessories:d.accessories||"",original:d.original||"",gender:Jt(d.gender??d.sex),updated_at:_}),f!=="__global__"){const y=`appearance:${f}`,v=(await D("meta",y))?.value||{},x=Nn(d);x?v[d.name]=x:delete v[d.name],await R("meta",{key:y,value:v,updated_at:_})}else(r||a)&&await $u(d,{clearAttire:r,clearAccessories:a});return d}async function $u(e,{clearAttire:t=!0,clearAccessories:n=!0}={}){if(!e||!t&&!n)return 0;const r=i=>!i||i.scope==="__global__"||ke(i)?!1:!!Eo(i,e);let a=0;try{const i=await ye("characters");for(const o of i||[]){if(!r(o))continue;const s=t?"":o.attire||"",c=n?"":o.accessories||"";(o.attire||"")===s&&(o.accessories||"")===c||(await R("characters",{...o,attire:s,accessories:c,updated_at:Date.now()/1e3}),a+=1)}}catch{}return a}async function _r(e,t){const n=l(e,200)||"__global__",r=l(t,80);if(!r)return!1;const a=await D("characters",{scope:n,id:r});if(await xt("characters",{scope:n,id:r}),n!=="__global__"&&a?.name){const i=`appearance:${n}`,o={...(await D("meta",i))?.value||{}};delete o[a.name],await R("meta",{key:i,value:o,updated_at:Date.now()/1e3})}return!0}var Cu=(e,t)=>!!Eo(e,t);function as(e){return(Array.isArray(e)?e:[]).filter(t=>{if(!t||typeof t!="object")return!1;const n=t;return!!(n.id||n.name)})}async function Tu(e,t,n=""){const r=as(t);if(!r.length)return{deleted:0,sessions:0};const a=l(n,200),i=new Set;let o=0,s=0;for(const c of e||[]){const u=l(c,200);if(!u||u===a||u==="__global__"||i.has(u))continue;i.add(u);const d=await ne(u);let f=!1;for(const p of d)r.some(m=>Cu(p,m))&&(await _r(u,p.id),o+=1,f=!0);f&&(s+=1)}return{deleted:o,sessions:s}}async function is(e,t,n=""){const r=as(t);if(!r.length)return{updated:0,sessions:0};const a=l(n,200),i=new Set;let o=0,s=0;for(const c of e||[]){const u=l(c,200);if(!u||u===a||u==="__global__"||i.has(u))continue;i.add(u);const d=await ne(u);let f=!1;for(const p of r){const m=_e(p.name,d)||(Array.isArray(p.aliases)?p.aliases.map(g=>_e(g,d)).find(Boolean):null)||(l(p.id,80)?d.find(g=>l(g.id,80)===l(p.id,80)):null);m&&await ot(u,{...p,id:m.id,name:m.name||p.name,appearance:p.appearance!=null?p.appearance:"",attire:p.attire!=null?p.attire:"",accessories:p.accessories!=null?p.accessories:"",original:p.original!=null?p.original:""})&&(o+=1,f=!0)}f&&(s+=1)}return{updated:o,sessions:s}}async function Cn(e,t,n={}){const r=l(e,200)||"__global__",a=n.prune===!0,i=Array.isArray(n.rootSessionIds)?n.rootSessionIds:[],o=oa(t||[]);if(i.length){if(a){const c=new Set;for(const u of o){for(const f of Mn(u))c.add(f);const d=z(u.name);d&&c.add(d)}for(const u of i){const d=l(u,200);if(!(!d||d==="__global__"))for(const f of await ne(d)){const p=[...Mn(f)],m=z(f.name);m&&p.push(m),!p.some(g=>c.has(g))&&await _r(d,f.id)}}}return o.length&&await is(i,o,""),_a(o.map(c=>Kt(c)).filter(c=>!!c))}const s=[];for(const c of o){const u=await ot(r,c);u&&s.push(u)}if(a){const c=new Set(s.map(u=>l(u.id,80)).filter(Boolean));for(const u of await ne(r)){const d=l(u.id,80);d&&!c.has(d)&&await _r(r,d)}}return s}async function Tn(e,t=""){const n=l(e,200),r=l(t,200),a=n?await ne(n):[],i=r?await ba(r):new Set,o=[];for(const s of await ne(Ve)){const c={...s};c.enabled_for_character=r?!ya(s,i):!0,o.push(c)}return{ok:!0,session_id:n,character_id:r,characters:a,global:o,appearance:Object.fromEntries(a.map(s=>[s.name,Nn(s)])),disabled_globals:[...i].sort(),global_enabled:r?await Eu(r):{}}}async function os(e,t,n=!0){const r=l(e,200);if(!r)return{ok:!1,error:{code:"bad_request",message:"target_session_id required"}};const a=[],i=new Set;for(const u of t||[]){const d=l(u,200);!d||i.has(d)||(i.add(d),a.push(...await ne(d)))}n&&!i.has(r)&&a.push(...await ne(r));const o=oa(a),s=[];for(const u of o){const d=_e(u.name,await ne(r)),f=await ot(r,{...u,id:d?.id||u.id,priority:Math.max(Number(d?.priority||0),Number(u.priority||0))});f&&s.push(f)}const c=new Set;for(const u of s){for(const f of Mn(u))c.add(f);const d=z(u.name);d&&c.add(d)}for(const u of await ne(r)){const d=[...Mn(u)],f=z(u.name);f&&d.push(f),!d.some(p=>c.has(p))&&await _r(r,u.id)}return{...await Tn(r),ok:!0,merged:s.length,sources:[...i]}}async function Ou(e){return Object.fromEntries((await ne(e)).map(t=>[t.name,Nn(t)]))}async function Pu(e,t){return await Cn(e,Object.entries(t||{}).map(([n,r])=>({name:n,tags:r}))),{ok:!0,appearance:await Ou(e)}}async function Lu(e){const{sessionId:t,tagged:n,shotChars:r}=e,a=e.unifiedSessionId??"",i=e.sourceSessionIds??[],o=l(e.characterId||"",200),s=l(t||"",200),c=()=>wa(t,a,o,i);let u=await c();const d=[...n.new_characters||[]],f=new Set(d.map(m=>z(m?.name))),p=(m,g=null)=>({surname:l(m?.surname||g?.surname||"",200),given_name:l(m?.given_name||g?.given_name||"",200),surname_variants:V([...hr(g?.surname_variants),...hr(m?.surname_variants),m?.surname,g?.surname]),given_name_variants:V([...hr(g?.given_name_variants),...hr(m?.given_name_variants),m?.given_name,g?.given_name])});for(const m of r||[]){const g=l(m.name,200);if(!g||f.has(z(g)))continue;const h=_e(g,u);h&&ke(h)||(d.push({name:h?.name||g,aliases:V(m.aliases)||h?.aliases||[g],original:l(m.original||m.original_tag||h?.original||"",400),appearance:N(m.label,m.age,m.appearance,m.body),attire:l(m.attire||""),accessories:l(m.accessories||""),...p(m,h)}),f.add(z(g)))}typeof n=="object"&&(n.new_characters=d);for(const m of d){const g=Kt(m);if(!g)continue;const h=_e(g.name,u),_=l(g.appearance||""),y=l(g.attire||""),v=l(g.accessories||""),x=p(g,h);if(h&&ke(h)){u=await c();continue}if(h&&!ke(h)){const A=h.scope==="__global__"?Ve:h.scope||s,O=V([...h.aliases||[],...g.aliases||[]]),E=_||h.appearance||"",M=h.original||g.original||"";await ot(A,{id:h.id||g.id,name:h.name||g.name,aliases:O.length?O:h.aliases||g.aliases,original:M,appearance:E,attire:y,accessories:v,attire_locked:ie(h.attire_locked),accessories_locked:ie(h.accessories_locked),...x}),u=await c();continue}h||await ot(s,{...g,attire_locked:ie(g.attire_locked),accessories_locked:ie(g.accessories_locked)}),u=await c()}for(const m of r||[]){const g=l(m.name,200);if(g){if(_e(g,u)){u=await c();continue}{const h=N(m.label,m.age,m.appearance||"",m.body||""),_=l(m.attire||""),y=l(m.accessories||"");await ot(s,{name:g,aliases:V(m.aliases)||[g],original:l(m.original||m.original_tag||"",400),appearance:h,attire:_,accessories:y,attire_locked:!0,accessories_locked:!0,...p(m,null)})}u=await c()}}return c()}async function Bu(){if((await ye("characters")).length)return;const e=(await ye("meta")).filter(t=>t.key?.startsWith("appearance:"));if(e.length)for(const t of e){const n=t.key.slice(11),r=t.value||{};for(const[a,i]of Object.entries(r)){const o=Kt({name:a,tags:i},a);o&&await ot(n,o)}}}async function Ru(){const e=await ye("characters");for(const t of e){if(Number(t.schema_version||0)>=2)continue;const n=Kt(t);n&&await R("characters",{...t,...n,scope:t.scope,updated_at:t.updated_at||Date.now()/1e3})}}function Du(e){const t=Number(e);return Number.isFinite(t)?Math.max(0,Math.min(5,Math.round(t))):3}function va(e){return e===!0||e==="true"||e===1||e==="1"||e==="on"||e==="full"?"two_stage":e===!1||e==="false"||e===0||e==="0"||e==="none"?"off":typeof e=="string"&&cs.has(e)?e:"off"}function xa(e){return e===!0||e==="true"||e===1||e==="1"||e==="on"}function ka(e){return e===!1||e==="false"||e==="off"||e==="none"?"off":e===!0||e==="true"||e==="on"?"short":e==="detailed"||e==="detail"?"detailed":e==="supplement"||e==="supp"?"supplement":typeof e=="string"&&ss.has(e)?e:"short"}function Sa(e){if(Array.isArray(e))return e.map(Sa);if(!e||typeof e!="object")return e;const t={};for(const[n,r]of Object.entries(e))us.has(n.toLowerCase())||(t[n]=Sa(r));return t}function Aa(e={}){if(!e||typeof e!="object"||Array.isArray(e))throw new TypeError("Settings must be an object");const t=ls(e),n=t.card&&typeof t.card=="object"&&!Array.isArray(t.card)?t.card:{};if(t.card=n,Number(n.scale_semantics_version||0)<2){const c=Number(n.inline_thumb_pct);n.inline_thumb_pct=Number.isFinite(c)?Math.max(1,c/6):100,n.scale_semantics_version=2}if(Number.isFinite(Number(n.overlay_x_pct))||Number.isFinite(Number(n.overlay_y_pct))||n.overlay_pin_unit==="pct"){n.overlay_pin_unit="pct";const c=String(n.overlay_pin_origin||"");(!c||c==="bottom-left")&&(n.overlay_pin_origin="bl")}const r=n.lore_extra;r===!0||r==="true"||r==="sections"?n.lore_extra="tags":r===!1||r==="false"||r==="none"?n.lore_extra="off":r==="full"||r==="tags"||r==="off"?n.lore_extra=r:n.lore_extra="tags",n.natural_base=ka(n.natural_base),n.person_tag_weight=Du(n.person_tag_weight);const a=t.curation&&typeof t.curation=="object"&&!Array.isArray(t.curation)?{...t.curation}:{},i=n.composition_curation===!0||n.composition_curation==="true"||n.composition_curation===1||n.composition_curation==="1"||n.composition_curation==="on";a.mode==null&&i&&(a.mode="two_stage"),a.mode=va(a.mode),a.strict_ids=xa(a.strict_ids);const o=a.embedding&&typeof a.embedding=="object"&&!Array.isArray(a.embedding)?{...a.embedding}:{};o.provider||(o.provider="openai"),o.model||(o.model="text-embedding-3-small"),o.endpoint||(o.endpoint="https://api.openai.com/v1/embeddings"),o.api_key==null&&(o.api_key=""),a.embedding=o,t.curation=a,n.composition_curation=!1;const s=n.overlay_markers!==!1;return n.overlay_markers=s,n.inline_previews=s,t.settings_schema_version=2,t}function Fu(e){return JSON.stringify(Sa(Aa(e)),null,2)}function zu(e){if(typeof e!="string")throw new TypeError("Settings JSON must be text");if(e.length>2e6)throw new RangeError("Settings JSON is too large");const t=JSON.parse(e);if(!t||typeof t!="object"||Array.isArray(t))throw new TypeError("Settings JSON must contain an object");return Aa(t)}var ss,cs,ls,us,On=C((()=>{ss=new Set(["off","short","detailed","supplement"]),cs=new Set(["off","two_stage","embed_snap"]),ls=e=>JSON.parse(JSON.stringify(e??{})),us=new Set(["api_key","auth_token","password","secret"])}));On();function ds(e){if(e==null||e==="")return null;const t=typeof e=="number"?e:Number(e);return Number.isFinite(t)?t:null}function Uu(e,t){let n=Number(e.cfg_scale??7),r=Number(e.cfg_rescale??.36);if(Number.isFinite(n)||(n=7),Number.isFinite(r)||(r=.36),t){const a=ds(t.cfg_scale);a!=null&&(n=a);const i=ds(t.cfg_rescale);i!=null&&(r=i)}return{cfg_scale:n,cfg_rescale:r}}function fs(e){if(!e||e.length<22)return!1;const t=Math.max(0,e.length-65536);for(let n=e.length-22;n>=t;n-=1)if(e[n]===80&&e[n+1]===75&&e[n+2]===5&&e[n+3]===6){const r=e[n+20]|e[n+21]<<8;if(n+22+r<=e.length)return!0}return!1}function st(e,t){return e[t]|e[t+1]<<8}function Xt(e,t){return(e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24)>>>0}function Ma(e){const t=Math.max(0,e.length-65536-22);for(let n=e.length-22;n>=t;n-=1)if(e[n]===80&&e[n+1]===75&&e[n+2]===5&&e[n+3]===6){const r=st(e,n+20);if(n+22+r<=e.length)return n}return-1}function Ju(e){const t=Ma(e);if(t<0)return null;const n=Xt(e,t+16);if(n+46>e.length||e[n]!==80||e[n+1]!==75||e[n+2]!==1||e[n+3]!==2)return null;const r=st(e,n+10),a=Xt(e,n+20),i=Xt(e,n+24),o=Xt(e,n+42);if(o+30>e.length||e[o]!==80||e[o+1]!==75||e[o+2]!==3||e[o+3]!==4)return null;const s=st(e,o+26),c=st(e,o+28),u=o+30+s+c;return u+a>e.length?null:{source:"central_dir",compMethod:r,compSize:a,uncompSize:i,dataStart:u,compData:e.subarray(u,u+a)}}function Ku(e){const t=st(e,6),n=st(e,8);let r=Xt(e,18);const a=st(e,26),i=st(e,28),o=30+a+i;if((t&8)!==0||r===0){let s=-1;for(let c=o+4;c<e.length-3;c+=1){if(e[c]!==80||e[c+1]!==75)continue;const u=e[c+2];if(u===7||u===1||u===5){s=c;break}}if(s<0){const c=Ma(e);c>o&&(s=c)}if(s<0)throw new Error("ZIP 데이터 경계를 찾지 못했습니다 (local header bit3)");r=s-o}if(o+r>e.length)throw new Error(`ZIP 엔트리 길이 초과 (need ${o+r}, have ${e.length})`);return{source:"local_header",compMethod:n,compSize:r,uncompSize:Xt(e,22),dataStart:o,compData:e.subarray(o,o+r)}}async function Gu(e){if(typeof DecompressionStream!="function")throw new Error("DecompressionStream 미지원 — ZIP deflate를 풀 수 없습니다");const t=pe(e);w("nai.inflate.start",{message:`${t.length}B`,bytes:t.length,focus:!0});const n=new DecompressionStream("deflate-raw"),r=n.writable.getWriter(),a=n.readable.getReader(),i=[];let o=0;const s=Date.now()+2e4,c=(async()=>{for(;;){if(Date.now()>=s)throw new Error(`ZIP inflate 타임아웃 (out=${o}B)`);const{done:f,value:p}=await a.read();if(f)break;p&&(i.push(p),o+=p.length,o>0&&o%524288<p.length&&w("nai.inflate",{message:`out ${Math.round(o/1024)}KB`,bytes:o,focus:!0}))}})(),u=131072;for(let f=0;f<t.length;f+=u){if(Date.now()>=s){try{await r.abort()}catch{}throw new Error(`ZIP inflate write 타임아웃 (in=${f}B)`)}await r.write(t.subarray(f,Math.min(t.length,f+u))),f>0&&f%(u*4)===0&&await Ye(0)}await r.close(),await c;const d=wn(i,o);return w("nai.inflate.done",{bytes:o,focus:!0}),d}async function Hu(e){const t=pe(e);if(w("nai.unzip.start",{message:`${t.length}B`,bytes:t.length,focus:!0}),vn(t))return w("nai.unzip",{message:"raw PNG",bytes:t.length,focus:!0}),Q(t);if(t.length<30||t[0]!==80||t[1]!==75){const a=Array.from(t.subarray(0,16)).map(i=>i.toString(16).padStart(2,"0")).join(" ");throw new Error(`ZIP/PNG 응답이 아닙니다 (len=${t.length}, head=${a})`)}const n=Ju(t)??Ku(t);w("nai.unzip.entry",{message:`${n.source} method=${n.compMethod} comp=${n.compSize}B uncomp=${n.uncompSize||"?"}`,comp_method:n.compMethod,bytes:n.compSize,source:n.source,focus:!0});const r=Ma(t);if(r>=0&&n.dataStart+n.compSize>r&&(w("nai.unzip.clamp",{message:`comp ${n.compSize} → ${r-n.dataStart}`,focus:!0},"warn"),n.compSize=r-n.dataStart,n.compData=t.subarray(n.dataStart,r)),n.compSize<=0)throw new Error("ZIP 압축 페이로드가 비어 있습니다");if(n.compMethod===0)return Q(n.compData);if(n.compMethod===8){const a=await Gu(n.compData);return!vn(a)&&!(a[0]===82&&a[1]===73)&&w("nai.unzip",{message:"inflated but not PNG/RIFF magic",bytes:a.length},"warn"),Q(a)}throw new Error(`지원하지 않는 ZIP 압축 방식: ${n.compMethod}`)}var ms=C((()=>{W(),ce(),gt()}));function qu(e="force"){return ve?(ve.forceFinish(e),!0):!1}async function Pe(e,t={}){const n=Rt()?.nativeFetch,r=n||globalThis.fetch,a=n?"nativeFetch":"fetch";if(typeof r!="function")throw new Error("fetch를 사용할 수 없습니다");const i={...t};i.networkRoute==null&&delete i.networkRoute;const o=se("net.fetch");w("net.fetch.start",{message:a,url:String(e).slice(0,120),has_signal:!!i.signal});try{const s=await r(e,i),c=Number(s?.status||(s?.ok===!1?0:200));return o.end({message:a,status:c,url:String(e).slice(0,80)}),s}catch(s){throw o.fail(s,{message:a,url:String(e).slice(0,80)}),s}}async function Qt(e,t={}){if(!e)throw new Error("빈 응답");const n=Number(t.deadline||Date.now()+Number(t.timeoutMs||9e4)),r=t.signal||null,a=typeof t.onProgress=="function"?t.onProgress:null,i=Number(t.idleMs||2500),o=(f=0)=>{if(r?.aborted)throw new Error(`NAI 본문 읽기 중단 (abort, ${f}B)`);if(Date.now()>=n)throw new Error(`NAI 본문 읽기 타임아웃 (${f}B received)`)};if(e instanceof ArrayBuffer)return e;if(e instanceof Uint8Array)return Q(e);if(typeof e=="string"){const f=e.replace(/\s+/g,"");if(f.length>64&&/^[A-Za-z0-9+/=]+$/.test(f))return w("nai.read_bytes",{message:"string base64 body",bytes:f.length,focus:!0}),Q(Re(f))}const s=e;if(s.buffer instanceof ArrayBuffer&&typeof s.byteLength=="number")return s.buffer.slice(s.byteOffset||0,(s.byteOffset||0)+s.byteLength);const c=e;if(e&&typeof e=="object"&&"data"in e&&!c.arrayBuffer&&!c.body)return Qt(c.data,t);let u=null;try{const f=c.headers,p=f?.get?.("content-length")||f?.get?.("Content-Length")||null;p&&(u=Number(p))}catch{}if(u!=null&&u>0&&(yr=u),w("nai.read_bytes.start",{message:"begin body",content_length:u,has_arrayBuffer:typeof c.arrayBuffer=="function",has_body_reader:!!(c.body&&typeof c.body.getReader=="function"),keys:e&&typeof e=="object"?Object.keys(e).slice(0,12).join(","):typeof e,focus:!0}),c.body&&typeof c.body.getReader=="function"){const f=c.body.getReader(),p=[];let m=0,g=Date.now(),h=Date.now(),_=!1,y=null;ve={forceFinish:(x="force")=>{_=!0,w("nai.read_bytes.force",{message:x,bytes:m||u||0,focus:!0});try{f.cancel()}catch{}y&&y({done:!0,value:void 0,__forced:!0})}};try{for(;o(m),!_;){if(m>=64&&Date.now()-g>=i){w("nai.read_bytes.idle_complete",{message:`${i}ms idle`,bytes:m,focus:!0});break}if(u!=null&&u>0&&m>=u){w("nai.read_bytes.length_complete",{bytes:m,content_length:u,focus:!0});break}const x=await new Promise((M,j)=>{let S=!1;const I=(U,Z)=>{S||(S=!0,clearInterval(P),y=null,Z?j(Z):M(U))};y=U=>I(U,null);const P=setInterval(()=>{if(!S){if(_)return I({done:!0,value:void 0,__forced:!0},null);if(m>=64&&Date.now()-g>=i)return I({done:!0,value:void 0,__idle:!0},null);if(u!=null&&u>0&&m>=u)return I({done:!0,value:void 0,__length:!0},null);if(r?.aborted||Date.now()>=n)return f.cancel().catch(()=>{}),I(null,new Error(`NAI 본문 읽기 타임아웃 (${m}B received)`))}},200);f.read().then(U=>I(U,null),U=>I(null,U))});if(x?.__forced||x?.__idle||x?.__length)break;const{done:A,value:O}=x;if(A)break;if(!O)continue;const E=O instanceof Uint8Array?O:new Uint8Array(O);if(p.push(E),m+=E.length,g=Date.now(),br=g,we=m,a&&a(m,u),Date.now()-h>=2e3&&(h=Date.now(),w("nai.read_bytes.progress",{message:`${Math.round(m/1024)}KB`,bytes:m,content_length:u,focus:!0})),fs(wn(p,m))&&Date.now()-g>=600){w("nai.read_bytes.zip_eocd",{bytes:m,focus:!0});break}if(u!=null&&u>0&&m>=u)break}}catch(x){if(m>=64){const A=wn(p,m);if(fs(A)||u!=null&&u>0&&m>=u*.98)return w("nai.read_bytes.recover",{message:String(x?.message||x),bytes:m,focus:!0},"warn"),ve=null,Q(A)}try{await f.cancel()}catch{}throw ve=null,x}if(ve=null,!m)throw new Error("NAI 본문이 비어 있습니다");const v=wn(p,m);return w("nai.read_bytes.done",{bytes:m,focus:!0}),Q(v)}const d=c.arrayBuffer;if(typeof d=="function"){w("nai.read_bytes",{message:"fallback arrayBuffer() — no body stream",focus:!0});let f=!1,p,m;const g=new Promise((y,v)=>{p=y,m=v});ve={forceFinish:(y="force")=>{w("nai.read_bytes.force",{message:`${y} (arrayBuffer)`,content_length:u,focus:!0},"warn"),f||(f=!0,clearInterval(h),m(new Error(`NAI arrayBuffer 강제중단 (${y}, content-length=${u})`)))}};const h=setInterval(()=>{f||(r?.aborted||Date.now()>=n?(f=!0,clearInterval(h),ve=null,m(new Error(`NAI arrayBuffer 타임아웃 (content-length=${u}). 본문 ~${u?Math.round(u/1024):"?"}KB를 플러그인이 받지 못했습니다.`))):w("nai.read_bytes.wait",{message:`arrayBuffer pending · expect ${u?Math.round(u/1024):"?"}KB`,content_length:u,focus:!0},"warn"))},3e3);d.call(c).then(y=>{f||(f=!0,clearInterval(h),ve=null,p(y))}).catch(y=>{f||(f=!0,clearInterval(h),ve=null,m(y))});const _=await g;if(_&&_.byteLength)return we=_.byteLength,w("nai.read_bytes.done",{bytes:_.byteLength,focus:!0}),_}if(typeof c.bytes=="function"){const f=await c.bytes();if(f?.length)return Q(f)}if(typeof c.text=="function"){const f=await c.text();if(/^[A-Za-z0-9+/=\s]+$/.test(f)&&f.replace(/\s+/g,"").length>64)try{return Q(Re(f.replace(/\s+/g,"")))}catch{}throw new Error(`바이너리 본문을 읽지 못함 (text head=${String(f).slice(0,120)})`)}throw new Error("바이너리 본문을 읽지 못함")}async function Wu(e,t,n,r={}){const a={Authorization:`Bearer ${e}`,"Content-Type":"application/json"},i=Number(r.timeoutMs||75e3),o=r.signal||null,s=JSON.stringify(t);if(w("nai.payload",{message:`body ${Math.round(s.length/1024)}KB`,bytes:s.length,model:t?.model,timeout_ms:i,url:String(n||"https://image.novelai.net/ai/generate-image").slice(0,100),has_nativeFetch:Zn("nativeFetch")}),s.length>15e5)throw w("nai.payload",{message:"too large",bytes:s.length},"error"),new Error(`NAI 페이로드가 너무 큼 (${Math.round(s.length/1024)}KB). 참조 이미지/프롬프트를 줄이세요.`);const c=typeof AbortController<"u"?new AbortController:null,u=()=>{w("nai.abort",{message:"external signal"},"warn"),c?.abort()};if(o){if(o.aborted)throw new Error("NAI 요청이 취소되었습니다.");o.addEventListener("abort",u,{once:!0})}const d=Date.now();we=0,yr=0,br=0,Na=!0;const f=setInterval(()=>{const m=Date.now()-d;m>=i?(w("nai.watchdog",{message:`abort after ${m}ms · body=${we}B`,ms:m,bytes:we},"warn"),c?.abort()):m>0&&m%1e4<1100&&w("nai.wait",{message:`waiting ${Math.round(m/1e3)}s · body=${we}B · ${mt()}`,ms:m,bytes:we,focus:!0},"warn")},1e3);let p=null;try{try{w("nai.fetch.start",{message:"POST generate-image",timeout_ms:i,focus:!0});const m=await Pe(n||"https://image.novelai.net/ai/generate-image",{method:"POST",headers:a,body:s,signal:c?.signal,requestTimeoutMs:i});if(w("nai.fetch.returned",{message:"nativeFetch resolved",ms:Date.now()-d,status:Number(m?.status||0),focus:!0}),o?.aborted||c?.signal?.aborted)throw w("nai.fetch.aborted",{ms:Date.now()-d},"error"),new Error(`NAI 타임아웃 (${Math.round(i/1e3)}s) — nativeFetch가 응답하지 않습니다. Models에서 NAI Test를 확인하세요.`);const g={signal:c?.signal,deadline:d+i,onProgress:v=>{we=v}};if(m&&typeof m=="object"&&"ok"in m&&"data"in m&&!m.arrayBuffer){const v=Number(m.status||(m.ok?200:0));if(w("nai.resp.shape",{message:"ok/data shape",status:v,focus:!0}),v===401)throw new Error("인증 실패 (401). NovelAI API 토큰(pst-...)을 확인하세요.");if(v===429)throw new Error("Rate limited (429). 잠시 후 다시 시도하세요.");if(v>=400){const O=typeof m.data=="string"?m.data:m.data instanceof Uint8Array?new TextDecoder().decode(m.data.subarray(0,220)):JSON.stringify(m.data||{}).slice(0,220);throw new Error(`NAI HTTP ${v}: ${O}`)}const x=se("nai.read_bytes"),A=await Qt(m.data,g);if(x.end({bytes:A?.byteLength||0,focus:!0}),!A||A.byteLength<32)throw new Error(`NAI 응답이 너무 짧음 (${A?.byteLength||0} bytes)`);return A}const h=Number(m?.status||0);if(w("nai.resp.shape",{message:"Response-like",status:h,has_arrayBuffer:typeof m?.arrayBuffer=="function",has_body:!!m?.body,focus:!0}),h===401)throw new Error("인증 실패 (401). NovelAI API 토큰(pst-...)을 확인하세요.");if(h===429)throw new Error("Rate limited (429). 잠시 후 다시 시도하세요.");if(h>=400){let v="";try{v=await m.text()}catch{}throw new Error(`NAI HTTP ${h}: ${v.slice(0,220)}`)}const _=se("nai.read_bytes"),y=await Qt(m,g);if(_.end({bytes:y?.byteLength||0,status:h,focus:!0}),!y||y.byteLength<32)throw new Error(`NAI 응답이 너무 짧음 (${y?.byteLength||0} bytes)`);return y}catch(m){throw p=String(m?.message||m),w("nai.fetch.error",{message:p,ms:Date.now()-d,bytes:we},"error"),/abort|timeout|타임아웃|취소|본문 읽기/i.test(p)?new Error(`NAI 타임아웃/본문실패 (${Math.round(i/1e3)}s, body=${we}B). ${p.slice(0,180)}`):m instanceof Error?m:new Error(p)}}finally{Na=!1,clearInterval(f),o&&o.removeEventListener("abort",u)}}var we,yr,br,ve,Na,Ia,ps,gs,hs,Nt=C((()=>{X(),W(),Dt(),ce(),ms(),we=0,yr=0,br=0,ve=null,Na=!1,Ia=()=>we,ps=()=>yr,gs=()=>br,hs=()=>ve!==null}));function Pn(e){return l(e?.backend||"nai").toLowerCase()==="comfy"?"comfy":"nai"}function Vu(e){const t=Number(e?.backend_timeout_seconds??300);return Math.max(30,Math.min(1800,Number.isNaN(t)?300:t))*1e3}function wr(e){return String(e||"").trim().replace(/\/+$/,"")}function _s(e){return wr(l(e?.comfy_url))||"http://localhost:8188"}function Ea(e){return!!l(e?.comfy_workflow_json)}async function ja(e,t={}){const n=await Pe(e,t);if(n&&typeof n=="object"&&"ok"in n&&"data"in n&&typeof n.arrayBuffer!="function"){const i=Number(n.status||(n.ok?200:0));let o=n.data;if(o instanceof Uint8Array&&(o=new TextDecoder().decode(o)),typeof o=="string")try{o=JSON.parse(o)}catch{}return{status:i,data:o}}const r=Number(n?.status||0);let a=null;try{a=await n.json()}catch{try{a=JSON.parse(await n.text())}catch{}}return{status:r,data:a}}async function Yu(e,t,n={}){const r=`inlay-nexus-${Math.random().toString(36).slice(2,10)}`,{status:a,data:i}=await ja(`${wr(e)}/prompt`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({client_id:r,prompt:t}),signal:n.signal});if(a>=400||!i?.prompt_id){const o=i?JSON.stringify(i.node_errors||i.error||i).slice(0,300):"";throw new Error(`/prompt 제출 실패 (HTTP ${a}) ${o}`)}return String(i.prompt_id)}async function Zu(e,t,n={}){const r=wr(e),a=Number(n.timeoutMs||3e5),i=Date.now()+a;let o=0,s="";for(;Date.now()<i;){if(n.signal?.aborted)throw new Error("이미지 대기 중단 (abort)");await Ye(2500),o+=1;let c=null;try{const{status:f,data:p}=await ja(`${r}/history/${t}`,{method:"GET",signal:n.signal});f<400&&p&&p[t]&&(c=p[t])}catch(f){s=String(f?.message||f);continue}if(o%8===0&&w("comfy.poll",{message:`${o}회 · ${Math.round((Date.now()-(i-a))/1e3)}s`,focus:!0}),!c)continue;const u=c.status||{};if(u.status_str==="error")throw new Error(`생성 실패: ${JSON.stringify(u.messages||[]).slice(0,400)}`);const d=c.outputs||{};for(const f of Object.keys(d)){const p=d[f]?.images;if(Array.isArray(p)&&p.length)return p.find(m=>(m?.type||"output")!=="temp")||p[0]}if(u.completed)throw new Error("생성은 완료됐지만 출력 이미지가 없습니다 (SaveImage 노드 확인)")}throw new Error(`이미지 대기 타임아웃 (${Math.round(a/1e3)}s)${s?` · ${s}`:""}`)}async function Xu(e,t,n={}){const r=new URLSearchParams({filename:l(t?.filename,300),subfolder:l(t?.subfolder,300),type:l(t?.type,40)||"output"}),a=await Pe(`${wr(e)}/view?${r.toString()}`,{method:"GET",signal:n.signal}),i={signal:n.signal,deadline:Date.now()+6e4};if(a&&typeof a=="object"&&"ok"in a&&"data"in a&&!a.arrayBuffer){const s=Number(a.status||(a.ok?200:0));if(s>=400)throw new Error(`/view 실패 (HTTP ${s})`);return Qt(a.data,i)}const o=Number(a?.status||0);if(o>=400)throw new Error(`/view 실패 (HTTP ${o})`);return Qt(a,i)}function Qu(e,t){let n=String(e||"");for(let r=0;r<8;r+=1){const a=n.replace(/\[\[#(\w+)\]\]([\s\S]*?)\[\[\/\1\]\]/g,(i,o,s)=>{const c=t[o];return c!=null&&String(c).trim()!==""?s:""});if(a===n)break;n=a}return n.replace(/[ \t]+\n/g,`
`).replace(/\n{3,}/g,`

`)}function ed(e,t){for(const n of Object.values(e)){const r=n?.inputs;if(!(!r||typeof r!="object"))for(const a of Object.keys(r)){const i=r[a];if(typeof i!="string"||!i.includes("[["))continue;const o=Qu(i,t),s=o.match(/^\[\[\s*(\w+)\s*\]\]$/);if(s&&s[1]in t){r[a]=t[s[1]];continue}r[a]=o.replace(/\[\[\s*(\w+)\s*\]\]/g,(c,u)=>u in t?String(t[u]):c)}}}function td(e,t){const n=Number(t)||1;for(const r of Object.values(e)){const a=r?.inputs;if(!(!a||typeof a!="object"))for(const i of Object.keys(a)){if(!/^(seed|noise_seed)$/i.test(i))continue;const o=a[i];(typeof o=="number"&&Number.isFinite(o)||typeof o=="string"&&/^\d+$/.test(o.trim()))&&(a[i]=n)}}}function ys({main:e,neg:t,captions:n,nai:r,seed:a}){const i={pos:String(e||""),neg:String(t||""),width:Number(r.width??832)||832,height:Number(r.height??1216)||1216,seed:Number(a)||1,steps:Number(r.steps??28)||28,cfg:Number(r.cfg_scale??7)||7};for(let o=0;o<6;o+=1)i[`char${o+1}`]=l(n?.[o]?.prompt,2e3);return i}function nd(e){let t=String(e||"");return t=t.replace(/(:\s*)\[\[\s*(\w+)\s*\]\](\s*[,}\]])/g,'$1"[[$2]]"$3'),t}function bs(e,t){const n=l(e);if(!n)throw new Error("ComfyUI 워크플로 JSON이 비어 있습니다. Models 탭에 API Export JSON을 붙여넣으세요.");let r;const a=nd(n);try{r=JSON.parse(a)}catch(s){const c=/\[\[/.test(n)?' · 팁: [[seed]] 같은 값은 반드시 "[[seed]]"처럼 따옴표로 감싸세요.':"";throw new Error(`ComfyUI 워크플로 JSON 파싱 실패: ${String(s?.message||s).slice(0,120)}${c}`)}if(!r||typeof r!="object"||Array.isArray(r))throw new Error("ComfyUI 워크플로는 API 포맷(JSON 객체, 노드ID→노드)이어야 합니다.");let i=r;if(i.nodes&&i.links)throw new Error("UI 저장 포맷 워크플로입니다. ComfyUI에서 'Export (API)'로 내보낸 JSON을 넣으세요.");const o=JSON.stringify(i);if(!/\[\[\s*pos\s*\]\]/.test(o))throw new Error("워크플로에 [[pos]]가 없습니다. 긍정 프롬프트를 넣는 칸에 [[pos]]를 적어 주세요.");return i=JSON.parse(o),ed(i,t),td(i,t.seed),i}async function rd(e,t,n,r){const a=_s(e),i=Vu(e),o=Number(e.seed??0)||Math.floor(Math.random()*4294967295)||1,s=ys({main:t,neg:n,captions:r,nai:e,seed:o}),c=bs(e.comfy_workflow_json,s);return w("comfy.generate.start",{message:a,prompt_len:String(t||"").length,chars:(r||[]).length,nodes:Object.keys(c).length,focus:!0}),ws.run(async()=>{const u=await Yu(a,c);w("comfy.generate.submitted",{message:u.slice(0,8),focus:!0});const d=await Zu(a,u,{timeoutMs:i}),f=await Xu(a,d);if(w("comfy.generate.done",{bytes:f?.byteLength||0,focus:!0}),!f||f.byteLength<256)throw new Error(`ComfyUI 응답 이미지가 너무 짧음 (${f?.byteLength||0}B)`);return[f,o]})}var ws,$a=C((()=>{W(),gt(),F(),Nt(),ws=new er}));$a(),bl(),ce(),F();var Ca=Vi;function ze(e,t=!1){let n=Ca[String(e).toLowerCase()]||e;return t&&(n+="-inpainting"),n}function ad(e){const t=[],n=[];for(const r of e.characters||[]){const a={x:r.center_x,y:r.center_y};t.push({char_caption:r.prompt,centers:[a]}),n.push({char_caption:r.uc||"",centers:[a]})}return{autoSmea:!0,prefer_brownian:!0,ucPreset:0,use_coords:!1,legacy_uc:!1,add_original_image:!0,v4_prompt:{caption:{base_caption:e.prompt,char_captions:t},use_coords:!1,use_order:!0},v4_negative_prompt:{caption:{base_caption:e.negative_prompt,char_captions:n},legacy_uc:!1}}}function id(e){const t=ze(e.model),n={width:e.width,height:e.height,n_samples:1,seed:e.seed,extra_noise_seed:e.seed,sampler:e.sampler,steps:e.steps,scale:e.cfg_scale,negative_prompt:e.negative_prompt,cfg_rescale:e.cfg_rescale,noise_schedule:e.scheduler,params_version:3,legacy:!1,legacy_v3_extend:!1};if(e.var_plus?n.skip_cfg_above_sigma=t.includes("4-5")?58:19:n.skip_cfg_above_sigma=null,t.includes("nai-diffusion-4")&&Object.assign(n,ad(e)),e.vibes?.length&&(n.reference_image_multiple=e.vibes.map(r=>r.encoded),n.reference_strength_multiple=e.vibes.map(r=>r.strength),n.reference_information_extracted_multiple=e.vibes.map(r=>r.information_extracted),n.normalize_reference_strength_multiple=!0),e.character_refs?.length){if(!t.includes("4-5"))throw new Error("Character Reference는 NAID4.5 전용입니다");n.director_reference_images=e.character_refs.map(r=>Ft(r.image)),n.director_reference_strength_values=e.character_refs.map(r=>r.strength),n.director_reference_secondary_strength_values=e.character_refs.map(r=>1-r.fidelity),n.director_reference_descriptions=e.character_refs.map(r=>({caption:{base_caption:r.type,char_captions:[]},legacy_uc:!1})),n.director_reference_information_extracted=e.character_refs.map(()=>1),n.controlnet_strength=1,n.inpaintImg2ImgStrength=1,n.normalize_reference_strength_multiple=!0,delete n.skip_cfg_above_sigma}return n}function Ue(e){const t=l(e)||"nai-diffusion-4-5-full",n=Object.fromEntries(Object.entries(Ca).map(([r,a])=>[a,r]));return Ca[t]?t:n[t]?n[t]:"naid4.5f"}X(),W(),gt(),ce(),ms(),Nt();var od=new er;async function vs(e,t,n,r={}){const a={input:t.prompt,model:ze(t.model),action:"generate",parameters:id(t)};return w("nai.generate.start",{message:a.model,prompt_len:String(t.prompt||"").length,chars:(t.characters||[]).length,has_char_refs:!!t.character_refs?.length,has_vibes:!!t.vibes?.length}),od.run(async()=>{const i=await Wu(e,a,n,r),o=se("nai.unzip");try{const s=await Hu(new Uint8Array(i)),c=vn(new Uint8Array(s));return o.end({bytes:s?.byteLength||0,is_png:c,zip_bytes:i?.byteLength||0}),c||w("nai.unzip",{message:"unzipped but not PNG magic",bytes:s?.byteLength||0},"warn"),{raw_bytes:s,seed:t.seed||0}}catch(s){throw o.fail(s,{zip_bytes:i?.byteLength||0}),s}})}async function sd(e){const t=await Pe(Ai,{method:"GET",headers:{Authorization:`Bearer ${e}`}}),n=Number(t?.status||0);if(n===401)throw new Error("인증 실패 (401). API 토큰을 확인하세요.");if(n>=400)throw new Error(`Anlas 조회 실패: HTTP ${n}`);const r=await t.json(),a=r.trainingStepsLeft||{},i=a.fixedTrainingStepsLeft||0,o=a.purchasedTrainingSteps||0,s=r.perks?.unlimitedMaxPriority||!1;return{fixed:i,purchased:o,total:i+o,opus:s}}function xe(e){return Number.isFinite(e)?Math.max(0,Math.min(100,e)):0}function cd(e){if(!e)return null;for(const t of["y_percent","anchor_percent","read_percent"]){const n=Number(e[t]);if(Number.isFinite(n))return xe(n)}return null}function ld(e){const t=e.length;if(!t)return[];const n=e.map((a,i)=>({index:i,y:cd(a)})).map((a,i)=>a.y!=null?a.y:t===1?50:xe(i/Math.max(1,t-1)*100)).map((a,i)=>({y:a,index:i})).sort((a,i)=>a.y-i.y||a.index-i.index),r=Array.from({length:t},()=>({from_percent:0,to_percent:100}));for(let a=0;a<n.length;a++){const{y:i,index:o}=n[a],s=a>0?n[a-1].y:null,c=a<n.length-1?n[a+1].y:null;let u,d;s==null&&c==null?(u=xe(i-Ta),d=xe(i+Ta)):s==null?(u=0,d=xe((i+c)/2)):c==null?(u=xe((s+i)/2),d=100):(u=xe((s+i)/2),d=xe((i+c)/2)),d<u&&(d=u),d-u<1&&(u=xe(i-.5),d=xe(i+.5),d<u&&(d=u)),r[o]={from_percent:Math.round(u*100)/100,to_percent:Math.round(d*100)/100}}return r}function ud(e,t,n){const r=e.length;if(!r)return{start:0,end:0};const a=xe(t),i=xe(n);let o=Math.floor(r*a/100),s=Math.ceil(r*i/100);return s<o&&(s=o),s===o&&o<r&&(s=Math.min(r,o+1)),{start:Math.max(0,o),end:Math.min(r,s)}}function dd(e,t,n,r=ks){const a=typeof e=="string"?e:"";if(!a)return"";let{start:i,end:o}=ud(a,t,n);const s=a.lastIndexOf(`
`,i);s>=0&&i-s<=80&&(i=s+1);const c=a.indexOf(`
`,o);c>=0&&c-o<=80&&(o=c);let u=a.slice(i,o).trim();return u.length>r&&(u=`${u.slice(0,r).trimEnd()}…`),u}function xs(e,t){return ld(e).map(n=>({focus:n,focus_hint:dd(t,n.from_percent,n.to_percent)}))}var Ta,ks,fd=C((()=>{Ta=15,ks=600})),md,Ss,As,Ms,pd=C((()=>{md=1,Ss="Inlay default (SFW)",As=[{id:"composition.solo",label:"솔로 구도",options:[{id:"1girl_solo_portrait",description:"여성 1명 초상·상반신·시청자 응시",tags:"cowboy shot, looking at viewer"},{id:"1boy_solo_portrait",description:"남성 1명 초상·상반신·시청자 응시",tags:"cowboy shot, looking at viewer"},{id:"solo_from_side",description:"혼자 옆모습",tags:"from side, cowboy shot"},{id:"solo_upper_body",description:"혼자 상반신 클로즈업",tags:"upper body, looking at viewer"}]},{id:"composition.duo",label:"2인 구도",options:[{id:"facing_each_other",description:"남녀가 서로를 향함",tags:"2::facing another::",slot:"char",by_slot:{female:"2::facing another::",male:"2::facing another::"}},{id:"male_behind_female",description:"남성이 여성 뒤",tags:"2::from side::, 2::side-by-side::, 2::behind another::"},{id:"side_by_side",description:"나란히 서 있음",tags:"2::side-by-side::, 2::from side::"},{id:"2girls_facing",description:"여성 둘이 마주봄",tags:"2::facing another::"},{id:"hug_front",description:"앞에서 안기",tags:"hug, facing another"}]},{id:"camera.framing",label:"카메라/프레이밍",options:[{id:"cowboy_shot",description:"허리 위",tags:"cowboy shot"},{id:"full_body",description:"전신",tags:"full body"},{id:"upper_body",description:"상반신",tags:"upper body"},{id:"close_up",description:"얼굴 클로즈업",tags:"close-up, face"},{id:"from_above",description:"위에서",tags:"from above"},{id:"from_below",description:"아래에서",tags:"from below"},{id:"from_side",description:"옆에서",tags:"from side"},{id:"pov",description:"1인칭 시점",tags:"pov, pov hands"}]},{id:"pose.hands",label:"손/포즈",options:[{id:"hand_on_own_chest",description:"자신의 가슴에 손",tags:"hand on own chest"},{id:"hands_up",description:"손 들기",tags:"hands up"},{id:"reaching_out",description:"손 뻗기",tags:"reaching out"},{id:"holding_hands",description:"손잡기",tags:"holding hands"},{id:"arm_around_waist",description:"허리에 팔",tags:"arm around waist"},{id:"hug_from_behind",description:"뒤에서 안기",tags:"hug from behind"}]},{id:"expression.basic",label:"표정",options:[{id:"smile",description:"미소",tags:"smile"},{id:"blush",description:"홍조",tags:"blush"},{id:"serious",description:"진지",tags:"serious"},{id:"open_mouth",description:"입 벌림",tags:"open mouth"},{id:"closed_eyes",description:"눈 감음",tags:"closed eyes"},{id:"looking_at_another",description:"상대를 봄",tags:"looking at another"}]},{id:"place.indoor",label:"실내 배경",options:[{id:"bedroom",description:"침실",tags:"bedroom, indoors"},{id:"classroom",description:"교실",tags:"classroom, indoors"},{id:"living_room",description:"거실",tags:"living room, indoors"},{id:"bathroom",description:"욕실",tags:"bathroom, indoors"},{id:"cafe",description:"카페",tags:"cafe, indoors"}]},{id:"place.outdoor",label:"야외 배경",options:[{id:"outdoors_day",description:"낮 야외",tags:"outdoors, blue sky"},{id:"street",description:"거리",tags:"street, outdoors"},{id:"park",description:"공원",tags:"park, outdoors, tree"},{id:"beach",description:"해변",tags:"beach, outdoors, ocean"},{id:"night_city",description:"밤 도시",tags:"outdoors, night, cityscape"}]}],Ms={version:1,name:Ss,groups:As}}));function Ln(e){return e?e.has_presets===!0?!0:e.presets!=null&&typeof e.presets=="object":!1}function gd(e){if(!e||typeof e!="object"||Array.isArray(e))return;const t={};for(const[n,r]of Object.entries(e)){const a=l(n,80);if(!a||!r||typeof r!="object"||Array.isArray(r))continue;const i=r,o=Array.isArray(i.fallback_order)?i.fallback_order.map(c=>l(c,160)).filter(Boolean):[],s=Math.max(1,Math.min(8,Number(i.max_active_groups)||1));o.length&&(t[a]={max_active_groups:s,fallback_order:o,...l(i.scope,40)?{scope:l(i.scope,40)}:{}})}return Object.keys(t).length?t:void 0}function Ns(e,t){const n=l(e,160).toLowerCase(),r=l(t,160).toLowerCase();if(!n||!r)return!1;if(n.endsWith(".*")){const a=n.slice(0,-1);return r.startsWith(a)||r===n.slice(0,-2)}return n.endsWith("*")?r.startsWith(n.slice(0,-1)):r===n}function Is(e){const t=Array.isArray(e)?e:l(e,800).split(/[,|]/),n=[],r=new Set;for(const a of t){const i=l(a,120);!i||r.has(i)||(r.add(i),n.push(i))}return n}function Es(e,t){const n=Is(t),r=e.modifier_lanes;if(!r||!Object.keys(r).length)return n;const a=new Map;for(const o of n){const s=tn(e,o);s&&a.set(o,s.group.id)}const i=new Set;for(const o of Object.values(r)){const s=new Set;for(const d of a.values())o.fallback_order.some(f=>Ns(f,d))&&s.add(d);if(s.size<=o.max_active_groups)continue;const c=[...s].map(d=>{let f=o.fallback_order.length;for(let p=0;p<o.fallback_order.length;p++)if(Ns(o.fallback_order[p],d)){f=p;break}return{gid:d,rank:f}});c.sort((d,f)=>d.rank-f.rank||d.gid.localeCompare(f.gid));const u=new Set(c.slice(0,o.max_active_groups).map(d=>d.gid));for(const{gid:d}of c)u.has(d)||i.add(d)}return i.size?n.filter(o=>{const s=a.get(o);return!s||!i.has(s)}):n}function Oa(){return{base:"",char:"",primary:"",secondary:"",female:"",male:""}}function It(e,t){const n=l(t,40).toLowerCase();if(["char","character","actor"].includes(n))return"char";if(["primary","main"].includes(n))return"primary";if(["secondary","partner"].includes(n))return"secondary";if(["female","f","girl","woman"].includes(n))return"female";if(["male","m","boy","man"].includes(n))return"male";if(["base","global","scene","camera","place"].includes(n))return"base";const r=l(e,160).toLowerCase();return/^(pose|expression|gesture|emotion|contact|action|interaction|manual|relation|gaze)([./_]|$)/.test(r)||/\.(pose|expression|gesture|interaction|manual|contact)\b/.test(r)||/^composition\.(duo|pair|multi|group|couple)/.test(r)?"char":/^(place|camera|background|location|framing|view|lighting|scene)([./_]|$)/.test(r)||/^composition\./.test(r)?"base":/^state\./.test(r)?"char":"base"}function js(e){const t=l(e,200).toLowerCase();if(!t)return null;const n=t.split(".")[0]||"";return n==="global"||n==="scene"||n==="camera"?"base":n==="primary"?"primary":n==="secondary"?"secondary":n==="female"||n==="girl"||n==="woman"?"female":n==="male"||n==="boy"||n==="man"?"male":n==="persona"?"base":null}function hd(e){return e.trim().toLowerCase()==="global.composition"}function $s(e){if(!e||typeof e!="object"||Array.isArray(e))return{};const t={};for(const[n,r]of Object.entries(e)){if(hd(n))continue;const a=js(n);if(!a)continue;const i=Bn(r);i&&(t[a]=N(t[a],i))}return t}function Et(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function Bn(e){if(typeof e=="string")return l(e,800);if(!Array.isArray(e)||!e.length)return"";const t=[];for(const n of e){if(typeof n=="string"){const i=l(n,200);i&&t.push(i);continue}if(!Array.isArray(n)||n.length<2)continue;const r=Number(n[0]),a=l(n[1],200);a&&(Number.isFinite(r)&&r!==1?t.push(`${r}::${a}::`):t.push(a))}return N(...t)}function _d(e,t,n){const r=Et(e);if(!r)return null;const a=l(r.id,120)||`opt_${t}`,i=$s(r.prompt),o=Et(r.by_slot)||Et(r.slots)||Et(r.actors),s={...i};if(o){for(const f of["base","char","primary","secondary","female","male"]){const p=l(o[f],800);p&&(s[f]=N(s[f],p))}for(const[f,p]of Object.entries(o)){const m=It(n,f);typeof p=="string"&&l(p)&&(s[m]=N(s[m],l(p,800)))}}let c=l(r.tags??r.tag,800);if(c||(c=Array.isArray(r.prompt)?Bn(r.prompt):""),c||(c=l(typeof r.prompt=="string"?r.prompt:"",800)),!c&&Object.keys(s).length&&(c=N(...Object.values(s))),!c)return null;const u=It(n,r.slot??r.target??r.apply_to),d=Object.keys(s).length?s:void 0;return{id:a,description:l(r.description??r.label??r.when,400)||a,tags:c,slot:u,...d?{by_slot:d}:{}}}function Cs(e,t,n){const r=Et(e);if(!r)return null;const a=l(r.id,160)||`group_${t}`,i=l(r.label??r.name??r.description,200)||a,o=Array.isArray(r.options)?r.options:Array.isArray(r.include_options)?r.include_options:[],s=[];for(let c=0;c<o.length&&s.length<n;c++){const u=_d(o[c],c,a);u&&s.push(u)}return s.length?{id:a,label:i,options:s,...r.continuity===!0||r.continuity==="true"?{continuity:!0}:{}}:null}function yd(e,t){const n=Array.isArray(e)?e:e&&typeof e=="object"?Object.values(e):[],r=[];for(let a=0;a<n.length;a++){const i=Cs(n[a],a,t);i&&r.push(i)}return r}function bd(e,t){return e.modifier_library!=null?{list:yd(e.modifier_library,80),maxOptions:80,nameHint:"Asset Maid catalog",preNormalized:!0}:Array.isArray(e.groups)?{list:e.groups,maxOptions:80,nameHint:"",preNormalized:!1}:Array.isArray(t)?{list:t,maxOptions:80,nameHint:"",preNormalized:!1}:{list:[],maxOptions:10,nameHint:"",preNormalized:!1}}function Pa(e,t="catalog"){const n=Et(e)||{},{list:r,maxOptions:a,nameHint:i,preNormalized:o}=bd(n,e),s=[];for(let E=0;E<r.length;E++){if(o){const j=r[E];if(j?.id&&Array.isArray(j.options)&&j.options.length){const S=j.options.slice(0,a).map((I,P)=>({...I,slot:I.slot||It(j.id,I.slot),id:I.id||`opt_${P}`,description:I.description||I.id||`opt_${P}`,tags:I.tags}));s.push({id:j.id,label:j.label||j.id,options:S,...j.continuity?{continuity:!0}:{}})}continue}const M=Cs(r[E],E,a);M&&s.push(M)}if(!s.length)throw new Error("큐레이션 카탈로그에 그룹이 없습니다. Inlay `{groups:[…]}` 또는 Asset Maid `modifier_library` JSON인지 확인하세요.");const c=Number(n.version)||1,u=l(n.name,200)||i||t,d=n.presets!=null&&typeof n.presets=="object"?n.presets:void 0,f=gd(n.modifier_lanes),p=Et(n.global)||{},m=Bn(p.fixed_positive)||l(p.fixed_positive??n.fixed_positive,800),g=Bn(p.fixed_negative)||l(p.fixed_negative??n.fixed_negative,800),h=n.subjects??p.subjects,_=n.selection??p.selection,y=p.prompt_order??n.prompt_order,v=Array.isArray(y)?y.map(E=>l(E,40)).filter(Boolean):void 0,x=new Set(s.filter(E=>E.continuity).map(E=>E.id)),A=n.continuity??p.continuity;if(Array.isArray(A))for(const E of A){const M=l(E,160);if(!M)continue;x.add(M);const j=s.find(S=>S.id===M);j&&(j.continuity=!0)}const O={version:c,name:u,groups:s,...d?{presets:d,has_presets:!0}:{has_presets:!1},...f?{modifier_lanes:f}:{},...m?{fixed_positive:m}:{},...g?{fixed_negative:g}:{},...h!=null&&typeof h=="object"?{subjects:h}:{},..._!=null&&typeof _=="object"?{selection:_}:{},...v?.length?{prompt_order:v}:{},...x.size?{continuity_group_ids:[...x].sort()}:{}};return O.sha=Rn(O),O}function La(e,t){const n=l(t,160);return n?e.continuity_group_ids?.includes(n)?!0:Os(e,n)?.continuity===!0:!1}function Ts(e){return e.groups.filter(t=>!La(e,t.id))}function Ba(){return Pa(Ms,"Inlay default (SFW)")}function Rn(e){const t=JSON.stringify({version:e.version,name:e.name,groups:e.groups.map(r=>({id:r.id,continuity:r.continuity??null,options:r.options.map(a=>({id:a.id,tags:a.tags,description:a.description,slot:a.slot,by_slot:a.by_slot}))})),presets:e.presets??null,modifier_lanes:e.modifier_lanes??null,fixed_positive:e.fixed_positive??null,fixed_negative:e.fixed_negative??null,subjects:e.subjects??null,selection:e.selection??null,prompt_order:e.prompt_order??null,continuity_group_ids:e.continuity_group_ids??null});let n=2166136261;for(let r=0;r<t.length;r++)n^=t.charCodeAt(r),n=Math.imul(n,16777619);return(n>>>0).toString(16).padStart(8,"0")}function wd(...e){const t=Oa();for(const n of e)n&&(t.base=N(t.base,n.base),t.char=N(t.char,n.char),t.primary=N(t.primary,n.primary),t.secondary=N(t.secondary,n.secondary),t.female=N(t.female,n.female),t.male=N(t.male,n.male));return t}function en(e){return e?{base:l(e.base,800),char:l(e.char,800),primary:l(e.primary,800),secondary:l(e.secondary,800),female:l(e.female,800),male:l(e.male,800)}:Oa()}function Os(e,t){const n=l(t,160);return n&&e.groups.find(r=>r.id===n)||null}function tn(e,t){const n=l(t,120);if(!n)return null;for(const r of e.groups){const a=r.options.find(i=>i.id===n);if(a)return{group:r,option:a}}return null}function vd(e){const t=[];for(const n of e.groups)for(const r of n.options)t.push({key:`${n.id}::${r.id}`,groupId:n.id,optionId:r.id,text:`${r.description} | ${r.tags}`,tags:r.tags,slot:r.slot||It(n.id)});return t}function xd(e,t=!1){const n=Ts(e).map(r=>{const a=r.options.map(i=>`  - ${i.id}: ${i.description}`).join(`
`);return`### ${r.id} (${r.label})
${a}`});return["Curation two-stage ON (pass 1).","Pick which modifier/composition GROUPS apply to each shot.","On every shot set `curation_groups`: array of exact group ids from the list below (may be []).","Still fill characters (appearance/attire/accessories) as usual.",...t?["STRICT catalog-id mode is ON: leave `camera`, `situation`, `natural`, and every `characters[].action` / `characters[].expression` completely EMPTY.","Pass 2 assembles ALL scene and per-actor tags from catalog ids only — do not pre-write any of them here."]:["Keep camera/situation/action SHORT or empty — pass 2 will refine scene tags from the chosen groups.","`natural` still follows the Natural base mode system message."],"`place` may stay as a short location hint.","","## Group catalog (ids only — do not invent ids)",...n].join(`
`)}function Ps(){return["## Per-actor ids (strict catalog-id mode)",'Add `"characters": [ { "index": 0, "option_ids": ["id", "..."] }, ... ]` to EVERY shot.','Each shot input includes `cast`: `[{ "index": 0, "name": "...", "gender": "girl|boy|""" }, ...]`.',"`index` MUST match `cast[].index` / Pass-1 `characters` array order — use name+gender from `cast`, not chat mention order.","Example: if cast says index 0 = 보민 (boy) and index 1 = Serin (girl), put bound/tears on the boy's index, not the girl's.","Put an option on `characters[].option_ids` when it targets ONE specific actor (pose, contact, expression, gaze).","Put an option on the shot-level `curation_option_ids` instead when it is scene-wide (camera, place, framing) — do not duplicate it into every actor.","Every actor in `cast` needs an entry, even if `option_ids` is `[]`.","This mode has NO freeform camera/situation/action fallback — an unlisted concept is simply omitted, never paraphrased."]}function kd(e,t,n){const r=n?.strictIds===!0,a=new Set(t.map(s=>l(s,160)).filter(Boolean)),i=Ts(e).filter(s=>a.has(s.id)),o=(i.length?i:[]).map(s=>{const c=s.options.map(u=>`  - ${u.id}: ${u.description}`).join(`
`);return`### ${s.id} (${s.label})
${c}`});return["Curation two-stage ON (pass 2 — scene refine, BATCH).","You receive ALL shots in one request. Return ONE JSON object covering every shot.",r?'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "characters": [ { "index": 0, "option_ids": ["id", "..."] } ] }, ... ] }':'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "camera": "...", "situation": "...", "place": "...", "action": "..." }, ... ] }',r?'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["bedroom"], "characters": [ { "index": 0, "option_ids": ["cowboy_shot", "smile"] }, { "index": 1, "option_ids": ["facing_each_other"] } ] } ] }':'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["cowboy_shot", "facing_each_other", "smile", "bedroom"], "place": "bedroom" } ] }',"shot_index must match the input shots array (0-based). Return exactly one entry per input shot, same order.","","## CRITICAL: fill curation_option_ids","`curation_option_ids` is the MAIN output — host injects catalog tags from those ids.","For EVERY shot pick ALL listed options that match the chat at that y_percent (pose, contact, expression, place…).","Typical **2–8 ids**; `[]` ONLY if nothing fits. Do not skip obvious matches.",r?"Do NOT invent character appearance/attire. Do NOT invent option ids. Do NOT write freeform camera/situation/action text — ids only.":"Prefer ids over freeform camera/situation/action paraphrase.",...r?[]:["Do NOT invent character appearance/attire. Do NOT invent option ids."],...Ls(),...r?["",...Ps()]:[],"",o.length?"## Allowed options (union of all shots' groups)":`## Allowed options
(none — leave scene fields empty)`,...o].join(`
`)}function Ls(){return["## Chat context (separate user message, READ-ONLY)","A prior user message is the exact chat text from pass 1 (for LLM prompt cache).","Use it for continuity only (who the cast is, ongoing scene).","Do NOT rewrite, quote-edit, summarize into the JSON, or invent missing plot beats.","Do NOT change shot count, shot_index, composition_id, composition_variant, or y_percent.","","## Shot focus bands (PRIMARY evidence)","Each shot includes `y_percent`, `focus: { from_percent, to_percent }`, and `focus_hint` (a short quote from that band of the chat).","Pick options primarily from `focus_hint` / the `focus` percent range for THAT shot.","Do NOT pull actions from far-away bands into this shot. Full chat is background, not a license to copy the same ids onto every shot.","When focuses differ, prefer distinct `curation_option_ids` / per-actor ids across shots — avoid pasting one identical set on every shot_index.","Do NOT invent aftermath tags (`after_sex`, `afterglow`, cum_on_*, etc.) unless `focus_hint` explicitly shows that aftermath.","y_percent / focus are already final — never output new y_percent or focus fields."]}function Sd(){return["Curation embed-snap mode: write DETAILED English Danbooru scene tags.","Fill camera, situation, place, action with concrete tags (framing, pose, contact, location, expression-as-scene).",'Use standard Danbooru spacing (underscores as spaces): e.g. "cowboy shot", "from side", "hand on own chest", "facing another".','Prefer specific pose/contact/framing over vague words like "intimate" or "dramatic".',"Character appearance/attire/accessories stay in character fields — do not move them into camera/situation.","`natural` still follows the Natural base mode system message."].join(`
`)}function Ad(e){const t=e.prompt_order;if(!t?.length)return Da;const n=[],r=new Set;for(const a of t){const i=js(a)||(l(a,40).toLowerCase()==="char"?"char":null);i&&!r.has(i)&&(r.add(i),n.push(i))}for(const a of Da)r.has(a)||n.push(a);return n}function Md(e,t){const n=Bs(e,t);return N(...Ad(e).map(r=>n[r]))}function Bs(e,t){const n=Array.isArray(t)?t:l(t,800).split(/[,|]/),r={base:[],char:[],primary:[],secondary:[],female:[],male:[]},a=new Set;for(const i of n){const o=l(i,120);if(!o||a.has(o))continue;const s=tn(e,o);if(!s)continue;a.add(o);const c=s.option.by_slot;if(c&&Object.keys(c).length){for(const u of Object.keys(c)){const d=l(c[u],800);d&&r[u].push(d)}continue}r[It(s.group.id)].push(s.option.tags)}return{base:N(...r.base),char:N(...r.char),primary:N(...r.primary),secondary:N(...r.secondary),female:N(...r.female),male:N(...r.male)}}function jt(e,t){t&&(e.action=N(l(e.action,600),t))}function Ra(e,t,n){const r={...Oa(),...t};e.camera=l(r.base,800),e.situation=l(n?.situation,400)||"",n&&"place"in n&&(e.place=l(n.place,400));const a=(Array.isArray(e.characters)?e.characters:[]).filter(o=>o&&typeof o=="object"),i=!!(r.char||r.primary||r.secondary||r.female||r.male);if(!a.length){e.action=i?N(r.char,r.primary,r.secondary,r.female,r.male):"";return}i&&(e.action=""),Nd(a,r)}function Rs(e){const t=Array.isArray(e?.characters)?e.characters:[],n=[];for(let r=0;r<t.length;r++){const a=t[r];if(!a||typeof a!="object"){n.push({index:r,name:"",gender:""});continue}const i=a,o=lr(i);n.push({index:r,name:l(i.name,200),gender:o==="f"?"girl":o==="m"?"boy":""})}return n}function Ds(e){if(!Array.isArray(e))return[];const t=[];for(const n of e){if(!n||typeof n!="object")continue;const r=n,a=Number(r.index);!Number.isInteger(a)||a<0||t.push({index:a,option_ids:r.option_ids??r.ids??r.curation_option_ids})}return t}function Fs(e,t,n){if(!t.length)return;const r=Array.isArray(e.characters)?e.characters:[];for(const{index:a,option_ids:i}of t){const o=r[a];if(!o||typeof o!="object")continue;const s=Md(n,i);s&&jt(o,s)}}function Nd(e,t){t.primary&&jt(e[0],t.primary),t.secondary&&e[1]&&jt(e[1],t.secondary);for(const n of e){t.char&&jt(n,t.char);const r=lr(n);t.female&&r==="f"&&jt(n,t.female),t.male&&r==="m"&&jt(n,t.male)}if(!e.some(n=>lr(n)!=null)){const n=N(t.female,t.male);if(n)for(const r of e)jt(r,n)}}function Id(e){return e.groups.reduce((t,n)=>t+n.options.length,0)}var Ed,jd,Da,Fa=C((()=>{pd(),F(),rt(),Ed=10,jd=80,Da=["base","char","primary","secondary","female","male"]}));function $d(e){let t=l(e.composition_id,160)||l(e.preset_id,160)||l(e.leaf_id,160)||l(e.position_id,160)||l(e.curation_leaf,160)||l(e.composition,160);if(t&&/[|/]/.test(t)){const r=t.split(/[/|]/).map(a=>l(a,160)).filter(Boolean);r.length>=2&&((!Array.isArray(e.preset_path)||!e.preset_path.length)&&(e.preset_path=r),t=r[r.length-1])}const n=l(e.composition_variant,120)||l(e.selected_variant_id,120)||l(e.variant_id,120)||l(e.variant,120);return t&&(e.composition_id=t),n&&(e.composition_variant=n),Array.isArray(e.preset_path)&&e.preset_path.length?!0:!!t}function $t(e){return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function Cd(e){const t=[];for(const n of["children","variants"]){const r=e[n];if(Array.isArray(r))for(const a of r){const i=$t(a);i&&t.push(i)}}return t}function zs(e){return Array.isArray(e.variants)?e.variants.map($t).filter(Boolean):[]}function Td(e){const t=e.when_to_use;return typeof t=="string"?l(t,400):Array.isArray(t)?l(t.map(n=>l(n,200)).filter(Boolean).join(" "),400):l(e.description,400)}function Od(e){const t=e.avoid_when;return typeof t=="string"?l(t,400):Array.isArray(t)?l(t.map(n=>l(n,200)).filter(Boolean).join(" "),400):""}function Pd(e){if(!e||typeof e!="object"||Array.isArray(e))return null;const t=e,n=l(t.ref??t.id??t.group,160);if(!n)return null;const r=Array.isArray(t.include_options)?t.include_options.map(o=>l(o,120)).filter(Boolean):void 0,a=t.action&&typeof t.action=="object"&&!Array.isArray(t.action)?t.action:null,i=a?{source:l(a.source,40)||void 0,target:l(a.target,40)||void 0,include_options:Array.isArray(a.include_options)?a.include_options.map(o=>l(o,120)).filter(Boolean):void 0}:void 0;return{ref:n,include_options:r?.length?r:void 0,replace:t.replace===!0,order:Number.isFinite(Number(t.order))?Number(t.order):void 0,action:i}}function Us(e){return Array.isArray(e.modifiers)?e.modifiers.map(Pd).filter(Boolean):[]}function Ld(e){if(!Ln(e))return[];const t=$t(e.presets);if(!t)return[];const n=[],r=(a,i,o,s)=>{const c=l(a.id,160),u=l(a.type,40),d=c&&c!=="preset"?[...i,c]:i,f=!o&&c&&c!=="preset"?c:o,p=u==="category"&&c?c:s,m=Array.isArray(a.children)?a.children.map($t).filter(Boolean):[],g=zs(a);if(c&&c!=="preset"&&(u==="position"||g.length>0&&m.length===0)){const h=Us(a),_=[...new Set(h.map(y=>y.ref).filter(Boolean))];n.push({id:c,path:d,composition:f||c,category:p,when:Td(a),avoid:Od(a),variants:g.map(y=>l(y.id,120)).filter(Boolean),description:l(a.description,300)||c,selectionModifiers:_})}for(const h of m)r(h,d,f,p)};return r(t,[],"",""),n}function Js(e,t,n){const r=$t(e.presets),a=l(t,160);if(!r||!a)return null;const i={chain:null},o=(f,p)=>{if(i.chain)return;const m=[...p,f];if(l(f.id,160)===a){i.chain=m;return}const g=Array.isArray(f.children)?f.children.map($t).filter(Boolean):[];for(const h of g)o(h,m)};o(r,[]);const s=i.chain;if(!s)return null;const c=l(n,120);if(!c)return s;const u=s[s.length-1],d=zs(u).find(f=>l(f.id,120)===c);return d?[...s,d]:s}function za(e,t){const n=t.preset_path;if(Array.isArray(n)&&n.length){const r=n.map(s=>l(s,160)).filter(Boolean),a=$t(e.presets);if(!a||!r.length)return null;const i=[a];let o=a;for(const s of r){if(l(o.id,160)===s)continue;const c=Cd(o).find(u=>l(u.id,160)===s);if(!c)return Js(e,r[r.length-1],void 0);i.push(c),o=c}return i}return Js(e,t.composition_id??(typeof n=="string"?n:""),t.composition_variant)}function Ua(e){const t=new Map;for(const n of e)for(const r of Us(n)){const a=t.get(r.ref);if(r.replace||!a){t.set(r.ref,r);continue}const i=[...new Set([...a.include_options||[],...r.include_options||[]])];t.set(r.ref,{...a,...r,include_options:i.length?i:a.include_options,action:r.action||a.action})}return[...t.values()]}function Bd(e,t){const n=new Map,r=new Set;for(const i of t){for(const o of Ua(i))n.set(o.ref,o);for(const o of Gs(i))r.add(o)}const a=[];for(const[i,o]of n){if(La(e,i))continue;const s=Os(e,i);if(!s)continue;const c=o.include_options?.length?new Set(o.include_options):null;let u=c?s.options.filter(d=>c.has(d.id)):s.options;if(r.size){const d=Hs(e,u.map(p=>p.id),r),f=new Set(d);u=u.filter(p=>f.has(p.id))}u.length&&a.push({id:s.id,label:s.label,options:u})}return a}function Rd(e,t){return t?.length?Ua(t).filter(n=>La(e,n.ref)):[]}function Ks(e){const t=l(e,40).toLowerCase();return t?["male","m","boy","man"].includes(t)?"male":["female","f","girl","woman"].includes(t)?"female":["primary","main"].includes(t)?"primary":["secondary","partner"].includes(t)?"secondary":["global","base","scene","camera"].includes(t)?"base":["char","both","all"].includes(t)?"char":null:null}function Dd(e){return en($s(e))}function Fd(e,t,n){const r=tn(e,t);if(!r)return en({});const a=n.find(s=>s.ref!==r.group.id?!1:!s.include_options?.length&&!s.action?.include_options?.length?!0:new Set([...s.include_options||[],...s.action?.include_options||[]]).has(t))||n.find(s=>s.ref===r.group.id);if(r.option.by_slot&&Object.keys(r.option.by_slot).length)return en(r.option.by_slot);const i=r.option.tags||Bn(r.option.tags);if(!i)return en({});if(a?.action){const s=Ks(a.action.source),c=Ks(a.action.target),u={};if(s&&(u[s]=i),c&&(u[c]=N(u[c],i)),s||c)return en(u)}const o=It(r.group.id);return en({[o]:i})}function Gs(e){const t=new Set;for(const n of e){const r=n.modifier_filter;if(!r||typeof r!="object"||Array.isArray(r))continue;const a=r.deny;if(!(!a||typeof a!="object"||Array.isArray(a))){for(const i of Object.values(a))if(Array.isArray(i))for(const o of i){const s=l(o,160).toLowerCase();s&&t.add(s)}}}return t}function Hs(e,t,n){return n.size?t.filter(r=>{const a=r.toLowerCase();if(n.has(a))return!1;const i=tn(e,r);if(!i)return!0;const o=l(i.option.tags,800).toLowerCase(),s=l(i.option.description,400).toLowerCase();for(const c of n){const u=c.replace(/_/g," ");if(o.includes(c)||o.includes(u)||s.includes(u))return!1}return!0}):t}function zd(e,t,n){const r=new Map;for(const a of n)Number.isFinite(a.order)&&r.set(a.ref,a.order);return r.size?t.map((a,i)=>({id:a,i})).sort((a,i)=>{const o=tn(e,a.id)?.group.id,s=tn(e,i.id)?.group.id,c=o!=null&&r.has(o)?r.get(o):Number.MAX_SAFE_INTEGER,u=s!=null&&r.has(s)?r.get(s):Number.MAX_SAFE_INTEGER;return c!==u?c-u:a.i-i.i}).map(a=>a.id):t}function Ud(e,t,n){if(!Ln(e))return null;const r=za(e,t);if(!r?.length)return null;const a=r.map(p=>Dd(p.prompt)),i=Ua(r),o=new Set(i.map(p=>p.ref)),s=[...i,...(n?.bindings||[]).filter(p=>!o.has(p.ref))],c=Gs(r),u=[...Is(t.curation_option_ids),...n?.optionIds||[]];let d=Es(e,u);d=Hs(e,d,c),d=zd(e,d,s);const f=d.map(p=>Fd(e,p,s));return wd(...a,...f)}function Jd(){return["# Preset selection (Asset Maid analyzer rules)","Use ONLY information in the chat/shot context. Do not invent unseen actors or actions.","","## Actors → composition first","Count actors that are required for the current moment's action/contact.","Pick a composition that matches actor count and genders (e.g. 1girl_solo vs 1girl_1boy).","Do NOT drop a visible partner to force solo. If a male hand/arm is visible contacting the girl from POV, that male is an actor → prefer 1girl_1boy, not 1girl_solo.","","## Walk the tree","Read the leaf list as composition → category → position.","Categories matter: `general` = non-sexual placement; `foreplay` / `sexual` / `insertion` = intimate contact. If the chat has kissing, licking, sexual touch, or sex, do NOT pick a `general` leaf just because posture when-text matches.","For each candidate use when / avoid / selection_modifiers. Prefer the leaf whose when matches AND whose selection_modifiers cover the stated actions.","selection_modifiers are modifier **group ids** this leaf unlocks for pass 2 (e.g. `interaction.partner.mouth_contact`). They are the main reason to prefer one leaf over another when posture is similar.","CRITICAL: do NOT pick a leaf that only matches vague posture words if it lacks the group needed for the chat action. Example: ear licking / kissing / licking neck need a leaf with `interaction.partner.mouth_contact` (usually under foreplay), not `general/facing_each_other` which only has `interaction.general`.","Pick exactly ONE `composition_id` (position leaf) per shot.","If the same leaf id appears under multiple compositions/categories (e.g. `free`), set `composition_id` to the full path string `composition / category / leaf` so the host can disambiguate.","","## Variant","If the leaf lists variants, pick `composition_variant` for the camera that fits (from_side, pov, default…).","If unsure and a default/from_side exists, prefer that over inventing camera tags.","","## What NOT to do in pass 1","Do NOT invent Danbooru camera/pose tags into camera/situation/action.","Do NOT return modifier option ids here (pass 2 does that — e.g. do not emit `licking_ear` in pass 1).","Do NOT set `curation_groups`."]}function Kd(e,t=!1){const n=Ld(e),r=new Map;for(const i of n){const o=r.get(i.composition)||[];o.push(i),r.set(i.composition,o)}const a=[];for(const[i,o]of r){a.push(`## composition: ${i}`);for(const s of o){const c=s.variants.length?s.variants.join("|"):"(none)",u=s.selectionModifiers.length?s.selectionModifiers.join(", "):"(none)",d=s.description&&s.description!==s.id&&s.description!==s.when?`description: ${s.description}`:"";a.push([`### ${s.id}`,`path: ${s.path.join(" / ")}`,s.category?`category: ${s.category}`:"",s.when?`when: ${s.when}`:"",s.avoid?`avoid: ${s.avoid}`:"",d,`selection_modifiers: ${u}`,`variants: ${c}`].filter(Boolean).join(`
`))}}return["Curation two-stage ON (pass 1 — Asset Maid presets).","CRITICAL: every shot MUST include `composition_id` (exact leaf id, or full path if id is ambiguous). This overrides the base format schema.","Also set `composition_variant` when the leaf lists variants.",...Jd(),"","On every shot set:","- `composition_id`: leaf id (e.g. `face_to_face_upright`) OR path `1girl_1boy / foreplay / face_to_face_upright` when ids collide","- `composition_variant`: one variant id for that leaf, or omit if none","Still fill characters (appearance/attire/accessories) as usual.","`place` may stay as a short location hint.",...t?["STRICT catalog-id mode is ON: leave `camera`, `situation`, `natural`, and every `characters[].action` / `characters[].expression` completely EMPTY.","Pass 2 assembles ALL scene and per-actor tags from catalog ids only, keyed off the `composition_id`/`composition_variant` you pick here."]:["Leave `situation` empty or non-person scene words only — NEVER put 1girl/1boy/solo there (host adds person-count tags).","`camera`/`action` must NOT include 1girl/1boy/solo either.","`natural` still follows the Natural base mode system message."],"","## Preset leaf catalog (do not invent ids)","selection_modifiers = group ids unlocked for pass 2 (not option ids). Use them to choose the leaf; pass 2 picks concrete options like licking_ear.",...a.length?a:["(empty presets tree)"]].join(`
`)}function Gd(e){const t=e.modifier_lanes;if(!t||!Object.keys(t).length)return[];const n=["## Modifier lanes (hard caps — host also enforces)","Within each lane, keep at most max_active_groups distinct groups."];for(const[r,a]of Object.entries(t))n.push(`- lane \`${r}\`: max ${a.max_active_groups} group(s) among [${a.fallback_order.join(", ")}] (earlier pattern wins if over cap)`);return n.push("Example: do not pick both manual.arm_pose and manual.partner_contact options together."),n}function Hd(e,t,n){const r=n?.strictIds===!0,a=Bd(e,t).map(i=>{const o=i.options.map(s=>`  - ${s.id}: ${s.description}`).join(`
`);return`### ${i.id} (${i.label})
${o}`});return["Curation two-stage ON (pass 2 — preset modifiers, BATCH).","You receive ALL shots in one request. Return ONE JSON object covering every shot.",r?'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "characters": [ { "index": 0, "option_ids": ["id", "..."] } ], "place": "..." }, ... ] }':'Schema: { "shots": [ { "shot_index": 0, "curation_option_ids": ["id", "..."], "place": "..." }, ... ] }',r?'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["bedroom"], "characters": [ { "index": 0, "option_ids": ["hug", "from_side"] }, { "index": 1, "option_ids": ["blush"] } ] } ] }':'Example: { "shots": [ { "shot_index": 0, "curation_option_ids": ["hug", "from_side", "blush", "bedroom"], "place": "bedroom" } ] }',"shot_index must match the input shots array (0-based). Return exactly one entry per input shot, same order.","","## CRITICAL: fill curation_option_ids","`curation_option_ids` is the MAIN output. Host injects those catalog tags into the image — empty array = weak/empty pose.","For EVERY shot, pick ALL options that match the chat band at that shot's y_percent:","- contact / hug / hands / pose / expression / gaze / blush / location / lighting / clothing state when visible","Typical count: **2–8 ids** when the scene has clear action; 1 id only if truly minimal; `[]` ONLY if nothing in the list fits.","Do NOT leave `curation_option_ids` empty just to be safe — if hug/facing/hand contact is in the text and listed below, INCLUDE those ids.","Pick ONLY ids listed below. Never invent ids. Never invent character appearance/attire.","Do NOT put Danbooru tags in freeform fields instead of picking ids — prefer ids.","`place` may repeat a short location hint; optional.","Host assembles path prompts + these options into base vs char slots.",...r?["",...Ps()]:[],...Ls(),...Gd(e),"",a.length?"## Allowed modifier options":`## Allowed modifier options
(none — return empty curation_option_ids)`,...a].join(`
`)}var qd=C((()=>{F(),Fa()}));function Wd(e,t){if(!e.length||e.length!==t.length)return-1;let n=0,r=0,a=0;for(let i=0;i<e.length;i++){const o=e[i],s=t[i];n+=o*s,r+=o*o,a+=s*s}return r<=0||a<=0?-1:n/(Math.sqrt(r)*Math.sqrt(a))}function Vd(e,t,n){const r=n?.minScore??.35,a=Qd(n?.groupId);let i=null,o=-1,s=null,c=-1;for(const u of t){const d=Wd(e,u.vector);d>o&&(o=d,i=u),a&&u.groupId===a&&d>c&&(c=d,s=u)}return s&&c>=r?s:i&&o>=r?i:null}function Yd(e){return e.slot||It(e.groupId)}function Zd(e,t,n,r=.4){const a=[],i=[],o=[],s=[],c=[],u=[],d=[];let f=0,p=0;const m=(g,h)=>{g==="base"?i.push(h):g==="primary"?s.push(h):g==="secondary"?c.push(h):g==="female"?u.push(h):g==="male"?d.push(h):o.push(h)};for(let g=0;g<e.length;g++){const h=e[g].trim();if(!h)continue;const _=t[g];if(!_||!_.length){a.push(h),i.push(h),p+=1;continue}const y=Vd(_,n,{minScore:r});y?(a.push(y.tags),m(Yd(y),y.tags),f+=1):(a.push(h),i.push(h),p+=1)}return{tags:a,baseTags:i,charTags:o,primaryTags:s,secondaryTags:c,femaleTags:u,maleTags:d,snapped:f,kept:p}}function Xd(e){const t=String(e||"").trim();if(!t)return[];const n=[];let r="",a=0;for(let o=0;o<t.length;o++){const s=t[o];if(s===":"&&t[o+1]===":"){a+=r.includes("::")?-1:1,r+="::",o+=1;continue}if(s===","&&a<=0){const c=r.trim();c&&n.push(c),r="";continue}r+=s}const i=r.trim();return i&&n.push(i),n}function Qd(e){return typeof e=="string"?e.trim():""}var ef=C((()=>{Fa()}));function Me(e){const t=l(e,40).toLowerCase().replace(/[ -]+/g,"_");return t==="openai_compatible"||t==="compat"?"openai_compat":xr.includes(t)?t:"openai"}function vr(e){switch(Me(e)){case"openai":return"https://api.openai.com/v1/embeddings";case"voyage":return"https://api.voyageai.com/v1/embeddings";case"openrouter":return"https://openrouter.ai/api/v1/embeddings";case"lmstudio":return"http://127.0.0.1:1234/v1/embeddings";case"ollama":return"http://127.0.0.1:11434/api/embeddings";default:return"https://api.openai.com/v1/embeddings"}}function Dn(e){switch(Me(e)){case"voyage":return"voyage-3-lite";case"ollama":return"nomic-embed-text";case"openrouter":return"openai/text-embedding-3-small";case"lmstudio":return"text-embedding-nomic-embed-text-v1.5";default:return"text-embedding-3-small"}}function tf(e){return Dn(e)}function nf(){const e=new Set;for(const t of xr){const n=vr(t).replace(/\/+$/,"");e.add(n),e.add(n.replace(/\/embeddings$/i,"")),e.add(n.replace(/\/api\/embeddings$/i,"")),e.add(n.replace(/\/v1$/i,""))}return e}function rf(e){const t=l(e,500);if(!t)return!0;const n=t.replace(/\/+$/,"");return nf().has(n)}function af(e){const t=l(e,200);return t?new Set(xr.map(n=>Dn(n))).has(t):!0}function of(e){const t=Me(e);return t!=="lmstudio"&&t!=="ollama"}function sf(e){const t=Me(e.provider),n=l(e.endpoint,500)||vr(t);return t==="ollama"?n.replace(/\/$/,""):/\/embeddings\/?$/i.test(n)?n.replace(/\/$/,""):/\/v1\/?$/i.test(n)?`${n.replace(/\/$/,"")}/embeddings`:n}function cf(e){const t=e&&typeof e=="object"?e:{},n=Array.isArray(t.data)?t.data:[],r=[];for(const a of n){const i=a&&typeof a=="object"?a.embedding:null;if(Array.isArray(i)&&i.every(o=>typeof o=="number"))r.push(i);else throw new Error("임베딩 응답에 숫자 벡터가 없습니다.")}return r}async function qs(e){const t=e.ok!==!1&&(e.status===void 0||e.status>=200&&e.status<300);if(typeof e.json=="function")try{const n=await e.json();if(!t){const r=typeof n=="object"&&n?JSON.stringify(n).slice(0,400):String(n);throw new Error(`임베딩 HTTP ${e.status??"?"}: ${r}`)}return n}catch(n){if(n instanceof Error&&n.message.startsWith("임베딩 HTTP"))throw n}if(typeof e.text=="function"){const n=await e.text();if(!t)throw new Error(`임베딩 HTTP ${e.status??"?"}: ${n.slice(0,400)}`);return n?JSON.parse(n):{}}throw new Error("임베딩 응답을 읽을 수 없습니다.")}async function Ja(e,t,n){if(!t.length)return{vectors:[],model:l(e.model)};const r=Me(e.provider),a=l(e.model,200)||Dn(r),i=sf({...e,provider:r,model:a}),o=l(e.api_key,4e3);if(r==="ollama"){const u=[];for(const d of t){const f=(await qs(await Pe(i,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:a,prompt:d}),signal:n?.signal}))).embedding;if(!Array.isArray(f)||!f.every(p=>typeof p=="number"))throw new Error("Ollama 임베딩 응답이 올바르지 않습니다.");u.push(f)}return{vectors:u,model:a}}const s={"Content-Type":"application/json"};o&&(s.Authorization=`Bearer ${o}`);const c=cf(await qs(await Pe(i,{method:"POST",headers:s,body:JSON.stringify(r==="voyage"?{model:a,input:t,input_type:"document"}:{model:a,input:t}),signal:n?.signal})));if(c.length!==t.length)throw new Error(`임베딩 개수 불일치: got ${c.length}, want ${t.length}`);return{vectors:c,model:a}}async function lf(e){const{vectors:t,model:n}=await Ja(e,["curation embedding ping"]),r=t[0]?.length||0;if(!r)throw new Error("임베딩 차원이 0입니다.");return{ok:!0,dims:r,model:n}}var Ka,xr,Ws=C((()=>{F(),Nt(),Ka=Object.freeze([{value:"openai",label:"OpenAI"},{value:"voyage",label:"Voyage"},{value:"openrouter",label:"OpenRouter"},{value:"openai_compat",label:"OpenAI-compat"},{value:"lmstudio",label:"LM Studio (로컬)"},{value:"ollama",label:"Ollama (로컬)"},{value:"custom",label:"Custom endpoint"}]),xr=Ka.map(e=>e.value)})),uf=sn({LLM_ENDPOINT_PRESETS:()=>ct,LLM_PROVIDERS:()=>ec,REASONING_EFFORTS:()=>Ga,applyReasoningToBody:()=>Qs,defaultEndpointForProvider:()=>Ys,endpointPresetKeyFor:()=>mf,ensureLlmRequestUrl:()=>Xs,knownLlmEndpoints:()=>Zs,llmModelPlaceholder:()=>ff,normalizeLlmProvider:()=>Ct,normalizeReasoningEffort:()=>Vs,shouldAutoReplaceEndpoint:()=>df});function Ct(e){const t=String(e||"").toLowerCase().replace(/[ -]+/g,"_").trim();return["openrouter"].includes(t)?"openrouter":["openai"].includes(t)?"openai":["google","google_ai","google_ai_studio","gemini"].includes(t)?"google_ai":["vertex","vertex_ai","google_vertex"].includes(t)?"vertex":["anthropic","anthropic_compat","anthropic_compatible","claude"].includes(t)?"anthropic_compatible":["lmstudio","lm_studio"].includes(t)?"lmstudio":["ollama"].includes(t)?"ollama":["custom"].includes(t)?"custom":["openai_compatible","openai_compat"].includes(t)?"openrouter":"custom"}function Vs(e){const t=String(e??"default").toLowerCase().trim();return!t||t==="auto"||t==="default"?"default":Ga.includes(t)?t:"default"}function Ys(e,t={}){const n=Ct(e);return n==="vertex"?`https://${String(t.region||"us-central1").trim().replace(/[^a-z0-9-]/gi,"")||"us-central1"}-aiplatform.googleapis.com`:n==="anthropic_compatible"?ct.anthropic:n==="custom"?ct.openai:ct[n]||ct.openai}function Zs(){const e=new Set;for(const t of Object.values(ct)){const n=String(t||"").replace(/\/+$/,"");n&&(e.add(n),e.add(n.replace(/\/chat\/completions$/i,"")),e.add(n.replace(/\/v1\/messages$/i,"")),e.add(n.replace(/\/v1$/i,"")))}return e.add("https://us-central1-aiplatform.googleapis.com"),e.add("https://europe-west1-aiplatform.googleapis.com"),e.add("https://asia-northeast1-aiplatform.googleapis.com"),e}function df(e){const t=String(e||"").trim().replace(/\/+$/,"");return t?Zs().has(t):!0}function Xs(e,t,n={}){const r=Ct(t);let a=String(e||"").trim().replace(/\/+$/,"");if(a||(a=Ys(r,n).replace(/\/+$/,"")),r==="anthropic_compatible")return/\/v1\/messages$/i.test(a)||/\/messages$/i.test(a)?a:/\/v1$/i.test(a)?`${a}/messages`:`${a}/v1/messages`;if(r==="vertex"){const i=String(n.region||"us-central1").trim().replace(/[^a-z0-9-]/gi,"")||"us-central1",o=String(n.projectId||"").trim();if(o)return`https://${i}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(o)}/locations/${encodeURIComponent(i)}/endpoints/openapi/chat/completions`;if(/aiplatform\.googleapis\.com/i.test(a)&&!/\/chat\/completions$/i.test(a))return a}return/\/chat\/completions$/i.test(a)?a:/\/openai$/i.test(a)?`${a}/chat/completions`:/\/v1beta$/i.test(a)?`${a}/openai/chat/completions`:/\/v1$/i.test(a)?`${a}/chat/completions`:a}function Qs(e,t){const n={};e&&typeof e=="object"&&Object.assign(n,e);const r=Vs(t);return r==="default"||(n.reasoning={effort:r}),n}function ff(e){const t=Ct(e),n={openrouter:"openai/gpt-4o-mini",openai:"gpt-4o-mini",google_ai:"gemini-2.5-flash",vertex:"gemini-2.0-flash-001",anthropic_compatible:"claude-sonnet-4",lmstudio:"local-model",ollama:"llama3.2",custom:"model-id"};return n[t]||n.custom}function mf(e){const t=String(e||"").trim().replace(/\/+$/,"");for(const[n,r]of Object.entries(ct)){const a=r.replace(/\/+$/,"");if(t===a||t===a.replace(/\/chat\/completions$/i,"")||t===a.replace(/\/v1\/messages$/i,""))return n}return"custom"}var ct,Ga,ec,kr=C((()=>{ct=Object.freeze({openai:"https://api.openai.com/v1/chat/completions",openrouter:"https://openrouter.ai/api/v1/chat/completions",google_ai:"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",lmstudio:"http://127.0.0.1:1234/v1/chat/completions",ollama:"http://127.0.0.1:11434/v1/chat/completions",anthropic:"https://api.anthropic.com/v1/messages",vertex:"https://us-central1-aiplatform.googleapis.com"}),Ga=Object.freeze(["default","none","minimal","low","medium","high","xhigh","max"]),ec=Object.freeze([{value:"openrouter",label:"OpenRouter"},{value:"openai",label:"OpenAI"},{value:"google_ai",label:"Google AI Studio"},{value:"vertex",label:"Vertex AI (Google Cloud)"},{value:"anthropic_compatible",label:"Anthropic-compatible"},{value:"lmstudio",label:"LM Studio (로컬)"},{value:"ollama",label:"Ollama (로컬)"},{value:"custom",label:"Custom endpoint"}])}));function Sr(e){const t=String(e||"").trim().toLowerCase();return t==="main"||t==="risu_main"||t==="risu-main"?"main":t==="aux"||t==="otherax"||t==="other_ax"||t==="risu_aux"||t==="risu-aux"||t==="sub"||t==="secondary"?"aux":"custom"}function pf(e){const t=Sr(e);return t==="main"||t==="aux"}function tc(e){const t=e||{};return pf(t.source)?!0:Ct(t.provider)==="vertex"?!!(l(t.model)&&(l(t.api_key)||l(t.service_account_json))):!!(l(t.model)&&l(t.api_key))}function gf(e){let t="";const n=[];for(const r of e||[]){const a=String(r?.role||""),i=r?.content;if(a==="system"){const o=typeof i=="string"?i:Array.isArray(i)?i.map(s=>typeof s=="object"?s.text||"":String(s)).join(""):String(i??"");t=t?`${t}
${o}`:o;continue}if(Array.isArray(i)){const o=[];for(const s of i){if(!s||typeof s!="object"){const f=String(s||"").trim();f&&o.push({type:"text",text:f});continue}const c=s.image_url,u=(typeof c=="object"&&c?c.url:"")||(typeof c=="string"?c:"");if(s.type==="image_url"||u){const f=String(u).match(/^data:([^;]+);base64,([\s\S]+)$/i);f&&o.push({type:"image",source:{type:"base64",media_type:f[1]||"image/png",data:f[2].replace(/\s+/g,"")}});continue}const d=String(s.text||"").trim();d&&o.push({type:"text",text:d})}n.push({role:a==="assistant"?"assistant":"user",content:o.length?o:[{type:"text",text:""}]});continue}n.push({role:a==="assistant"?"assistant":"user",content:String(i??"")})}return{system:t,messages:n}}function hf(e){const t=e?.choices||[];if(!t.length)throw new Error("LLM returned no choices.");let n=(t[0].message||{}).content;return Array.isArray(n)&&(n=n.map(Mr).join("")),l(n)}function _f(e){const t=e?.content,n=(Array.isArray(t)?t:[]).map(Mr).join(""),r=l(n||e?.completion||"");if(!r)throw new Error("Anthropic 응답이 비어 있습니다.");return r}async function Ar(e){if(!Fn(e))return"";const t=e.getReader(),n=typeof TextDecoder<"u"?new TextDecoder:null;let r="",a="";for(;;){const{done:i,value:o}=await t.read();if(i)break;if(typeof o=="string")r=o,a+=o;else if(o instanceof Uint8Array)a+=n?n.decode(o,{stream:!0}):"";else if(o&&typeof o=="object"){const s=o,c=s[0];typeof c=="string"?r=c:typeof s.content=="string"?r=s.content:typeof s.text=="string"&&(r=s.text)}}return n&&(a+=n.decode()),r||a}async function yf(e){if(typeof e=="string")return e;if(Fn(e))return Ar(e);if(e==null)return"";if(typeof e=="number"||typeof e=="boolean")return String(e);if(typeof e=="object"){const t=e,n=l(t.type,40).toLowerCase();if(n==="fail"||n==="error"){const a=l(t.result||t.message||t.error||"Risu LLM 실패",800);throw new Error(`Risu LLM 실패: ${a}`)}if(n==="streaming"||n==="stream"){const a=await Ar(t.result??t.data??t.stream);if(a.trim())return a}if(n==="success"||n==="ok"){const a=t.result??t.data??t.content;if(typeof a=="string")return a;if(Fn(a))return Ar(a)}const r=[t.choices?.[0]?.message?.content,t.choices?.[0]?.text,t.choices?.[0]?.delta?.content,t.message?.content,t.content,t.text,t.response,n?null:t.result,t.output];for(const a of r){if(typeof a=="string"&&a.trim())return a;if(Array.isArray(a)){const i=a.map(Mr).join("");if(i.trim())return i}if(Fn(a)){const i=await Ar(a);if(i.trim())return i}}try{return JSON.stringify(e)}catch{return String(e)}}return String(e||"")}var Fn,Mr,Ha=C((()=>{F(),kr(),Fn=e=>!!e&&typeof e.getReader=="function",Mr=e=>typeof e=="object"?e?.text||"":String(e||"")}));async function bf(){try{const e=await Se(Fr,wi);if(e==null||e==="")return ge(Qe);const t=typeof e=="string"?JSON.parse(e):e;if(!t||typeof t!="object")return ge(Qe);const n=Aa(t),r=et(Qe,n);return JSON.stringify(t)!==JSON.stringify(n)&&await nc(r),r}catch(e){console.warn("[Inlay Nexus] settings load failed",e?.message||e)}return ge(Qe)}async function nc(e){if(await Ae(Fr,ge(e)),await Se("inx_native_settings")==null)throw new Error("설정 저장 실패: IndexedDB(getLocalPluginStorage)에 기록되지 않았습니다.")}var rc=C((()=>{X(),yt(),Ut(),mr()}));async function wf(){const e=await D("meta","prompt:__pack__"),t=!e||e.text!=="2026-08-06-roster-detected-only",n=Date.now()/1e3;for(const r of cn)await D("meta",`prompt:${r}`)&&!(t&&bi.includes(r))||await R("meta",{key:`prompt:${r}`,text:Sn(r),updated_at:n});await R("meta",{key:"prompt:__pack__",text:yi,updated_at:n})}async function ue(e){const t=await D("meta",`prompt:${e}`);return t?.text!=null?t.text:Sn(e)}async function ac(e,t){const n=Date.now()/1e3;return await R("meta",{key:`prompt:${e}`,text:t,updated_at:n}),{ok:!0,key:e,updated_at:n}}async function Nr(){const e=await ye("meta"),t=new Map(e.filter(r=>r.key?.startsWith("prompt:")&&!r.key.startsWith("prompt:__")).map(r=>[r.key.slice(7),{key:r.key.slice(7),text:r.text||"",updated_at:r.updated_at||0}])),n=[];for(const r of cn){const a=t.get(r);a?n.push(a):n.push({key:r,text:Sn(r),updated_at:0}),t.delete(r)}for(const r of t.values())n.push(r);return n}async function vf(){const e=await Nr(),t={};for(const n of e)t[n.key]=n.text;return{version:We,prompts:t}}async function xf(e){const t=Sf(e);let n=0;const r=Date.now()/1e3;for(const a of cn)Object.prototype.hasOwnProperty.call(t,a)&&(await R("meta",{key:`prompt:${a}`,text:String(t[a]??""),updated_at:r}),n+=1);return{ok:!0,updated:n,prompts:await Nr()}}async function kf(e){const t=e?.keep_author_note!==!1,n=Date.now()/1e3;let r=0;for(const a of cn)t&&a==="author_note"||(await R("meta",{key:`prompt:${a}`,text:Sn(a),updated_at:n}),r+=1);return{ok:!0,updated:r,keep_author_note:t,prompts:await Nr()}}function Sf(e){let t=e;if(typeof e=="string"){const i=e.trim();if(!i)return{};t=JSON.parse(i)}if(!t||typeof t!="object"||Array.isArray(t))return{};const n=t,r={},a=n.prompts;if(a&&typeof a=="object"&&!Array.isArray(a)){for(const[i,o]of Object.entries(a))typeof i=="string"&&(r[i]=String(o??""));return r}if(Array.isArray(a)){for(const i of a){if(!i||typeof i!="object")continue;const o=i,s=String(o.key||"");s&&(r[s]=String(o.text??""))}return r}if(typeof n.key=="string"&&"text"in n)return r[n.key]=String(n.text??""),r;for(const[i,o]of Object.entries(n))i==="version"||i==="ok"||typeof o=="string"&&(r[i]=o);return r}async function Je(){const e=ge($());await So.run(()=>nc(e))}function Af(){return Fu($())}async function Mf(e){const t=zu(String(e??"").slice(0,2000001)),n=ge($());await R("meta",{key:"settings_backup",value:n,updated_at:Date.now()/1e3});const r=et(Qe,t);return r.llm={...r.llm,api_key:n.llm?.api_key||""},r.nai={...r.nai,api_key:n.nai?.api_key||""},r.auth_token=n.auth_token||"",rr(r),await Je(),{ok:!0,settings:Ir()}}async function Nf(){const e=ge($());await R("meta",{key:"settings_backup",value:e,updated_at:Date.now()/1e3});const t=ge(Qe);t.llm={...t.llm,api_key:e.llm?.api_key||""},t.nai={...t.nai,api_key:e.nai?.api_key||""},t.auth_token=e.auth_token||"";const n=e.card;return t.card={...t.card,presets:Array.isArray(n.presets)?ge(n.presets):t.card.presets||[],active_preset_id:String(n.active_preset_id||t.card.active_preset_id||""),custom_pos:String(n.custom_pos??t.card.custom_pos??""),custom_neg:String(n.custom_neg??t.card.custom_neg??"")},rr(t),await Je(),{ok:!0,settings:Ir()}}function If(){const e=$(),t=e.nai,n=e.llm;let r=0,a=0,i=0,o=0;try{r=In("cards"),a=In("images"),i=gu();const s=new Set;for(const c of hu()){const u=l(c.character_id||"",200)||"unknown",d=l(c.chat_id||"",200)||"unknown";s.add(`${u}|${d}`)}o=s.size}catch{}return{ok:!0,version:We,pid:0,source_file:"native",nai_configured:Pn(t)==="comfy"?Ea(t):!!l(t.api_key),image_backend:Pn(t),llm_configured:tc(n),port:0,image_mode:"data-url",storage:"indexeddb",storage_api:"getLocalPluginStorage",storage_scope:"device-local",cards:r,images:a,folders:o,png_bytes:i,last_stage:bn(),focus_stage:mt(),last_error:Qn(),debug_events:$i()}}function Ir(){const e=ge($());e.nai?.api_key?(e.nai.api_key="",e.nai.api_key_configured=!0):e.nai={...e.nai,api_key_configured:!1},e.llm?.api_key?(e.llm.api_key="",e.llm.api_key_configured=!0):e.llm={...e.llm,api_key_configured:!1},e.llm?.service_account_json?(e.llm.service_account_json="",e.llm.service_account_configured=!0):e.llm={...e.llm,service_account_configured:!1};const t=e.nai;t.backend=Pn(t),t.image_backend=t.backend,t.comfy_configured=Ea(t);const n=xo(),r=ko(),a=!qa.includes(l(t.image_reference));t.image_reference_configured=!!(a&&n),t.image_reference||(t.image_reference=t.image_reference_configured?"file":"none"),t.image_reference_configured&&n&&(t.reference_preview_url=n);const i=!qa.includes(l(t.vibe_transfer));if(t.vibe_transfer_configured=!!(i&&r),t.vibe_transfer||(t.vibe_transfer=t.vibe_transfer_configured?"file":"none"),t.vibe_transfer_configured&&r&&(t.vibe_preview_url=r),Array.isArray(e.card?.presets))for(const c of e.card.presets){if(!c||typeof c!="object")continue;const u=c,d=l(u.id,120),f=d?Zr(d):"";f?(u.vibe_configured=!0,u.vibe_preview_url=f):(delete u.vibe_configured,delete u.vibe_preview_url),delete u.vibe_transfer}e.card.character_max=nt(e.card),e.database_path="indexeddb:getLocalPluginStorage",e.images_dir="indexeddb:inx_nximg_*",e.prompts_dir="embedded";const o=e.curation&&typeof e.curation=="object"?e.curation:{},s=o.embedding&&typeof o.embedding=="object"?{...o.embedding}:{};return s.api_key?(s.api_key="",s.api_key_configured=!0):s.api_key_configured=!1,o.embedding=s,e.curation=o,e.storage={...e.storage,backend:"indexeddb",api:"getLocalPluginStorage",image_encoding:"base64",scope:"device-local",image_mode:"data-url"},e}async function Ef(e){const t=e&&typeof e=="object"?e:{},n=$(),r={...t.nai||{}},a={...t.llm||{}},i={...t.card||{}};if("api_key"in r){const o=r.api_key;delete r.api_key,delete r.api_key_configured,l(o)&&(n.nai.api_key=o),(r.clearApiKey||t.clear_nai_key)&&(n.nai.api_key=""),delete r.clearApiKey}if("api_key"in a){const o=a.api_key;delete a.api_key,delete a.api_key_configured,l(o)&&(n.llm.api_key=o),(a.clearApiKey||t.clear_llm_key)&&(n.llm.api_key=""),delete a.clearApiKey}if("service_account_json"in a){const o=a.service_account_json;delete a.service_account_json,delete a.service_account_configured,l(o)&&(n.llm.service_account_json=o),(a.clearServiceAccount||t.clear_llm_service_account)&&(n.llm.service_account_json=""),delete a.clearServiceAccount}if(Object.keys(i).length){const o=et(n.card,i);Array.isArray(i.presets)&&(o.presets=i.presets),"active_preset_id"in i&&(o.active_preset_id=i.active_preset_id),"custom_pos"in i&&(o.custom_pos=i.custom_pos),"custom_neg"in i&&(o.custom_neg=i.custom_neg),n.card=o,n.card.character_max=nt(n.card)}if(Object.keys(r).length&&(n.nai=et(n.nai,r)),Object.keys(a).length&&(n.llm=et(n.llm,a)),t.curation&&typeof t.curation=="object"){const{updateCurationSettings:o}=await Promise.resolve().then(()=>(Jn(),Of));await o(t.curation)}for(const o of["bind_host","port","auth_token"])o in t&&(n[o]=t[o]);return await Je(),{ok:!0,settings:Ir()}}var qa,lt=C((()=>{Ut(),On(),X(),W(),yt(),F(),rt(),Ha(),rc(),$e(),he(),qa=["","none","off","false","0"]}));function ic(e){const t=typeof e=="string"?e:JSON.stringify(e);return Wa(Ft(new TextEncoder().encode(t)))}function jf(e){const t=ArrayBuffer.isView(e)?new Uint8Array(e.buffer,e.byteOffset,e.byteLength):pe(e);return Wa(Ft(t))}async function $f(e){let t;try{t=typeof e=="string"?JSON.parse(e):e}catch{throw new Error("Vertex Service Account JSON 파싱 실패")}if(!t?.client_email||!t?.private_key)throw new Error("Service Account JSON에 client_email/private_key가 필요합니다.");if(!globalThis.crypto?.subtle)throw new Error("이 환경에서는 Vertex Service Account(JWT) 서명을 지원하지 않습니다. API key 칸에 OAuth access token을 넣거나 Google AI Studio를 쓰세요.");const n=Math.floor(Date.now()/1e3),r=`${ic({alg:"RS256",typ:"JWT"})}.${ic({iss:t.client_email,scope:"https://www.googleapis.com/auth/cloud-platform",aud:"https://oauth2.googleapis.com/token",iat:n,exp:n+3600})}`,a=String(t.private_key).replace(/\\n/g,`
`).replace(/-----BEGIN [^-]+-----/,"").replace(/-----END [^-]+-----/,"").replace(/\s+/g,""),i=Uint8Array.from(atob(a),d=>d.charCodeAt(0)),o=await crypto.subtle.importKey("pkcs8",i,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},!1,["sign"]),s=`${r}.${jf(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",o,new TextEncoder().encode(r)))}`,c=await Pe("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(s)}`});let u={};try{u=await c.json()}catch{u={}}if(!u?.access_token)throw new Error(`Vertex 토큰 발급 실패: ${JSON.stringify(u).slice(0,240)}`);return{accessToken:String(u.access_token),projectId:l(t.project_id||"")}}var Wa,Cf=C((()=>{ce(),F(),Nt(),Wa=e=>e.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}));async function nn(e,t){const n=Sr(e.source);if(n==="main"||n==="aux")return Tf(e,t,n);const r=Ct(e.provider),a=l(e.model),i=l(e.vertex_region)||"us-central1";let o=l(e.api_key),s="";if(r==="vertex"&&l(e.service_account_json)){const m=await $f(e.service_account_json);o=m.accessToken,s=m.projectId}if(!a||!o)throw w("llm.config",{message:"missing model/api_key",provider:r},"error"),new Error(r==="vertex"?"Vertex AI: Model + Service Account JSON(또는 access token)이 필요합니다.":"태깅 LLM이 설정되지 않았습니다. 모델 설정에서 Provider·Model·API key를 넣으세요. (NovelAI 키와 별개)");const c=Xs(l(e.endpoint),r,{region:i,projectId:s});if(r==="vertex"&&!/\/chat\/completions$/i.test(c))throw new Error("Vertex AI: project_id가 있는 Service Account JSON이 필요합니다. (OpenAI-compatible endpoint 구성용)");const u=Number(e.timeout_seconds??180)*1e3,d=typeof AbortController<"u"?new AbortController:null,f=setTimeout(()=>{w("llm.abort",{message:`timeout ${u}ms`,model:a,provider:r},"warn"),d?.abort?.()},u),p=se("llm.call");w("llm.call.start",{message:a,msgs:t?.length||0,timeout_ms:u,source:n,provider:r,reasoning:l(e.reasoning_effort)||"default"});try{let m;if(r==="anthropic_compatible"){const y=gf(t),v={model:a,max_tokens:Number(e.max_tokens??8e3),temperature:Math.min(1,Number(e.temperature??.4)),messages:y.messages};y.system&&(v.system=y.system),m=await Pe(c,{method:"POST",headers:{"Content-Type":"application/json","x-api-key":o,"anthropic-version":l(e.anthropic_version)||"2023-06-01"},body:JSON.stringify(v),signal:d?.signal})}else{const y=Qs({model:a,messages:t,temperature:Number(e.temperature??.4),max_tokens:Number(e.max_tokens??8e3)},e.reasoning_effort),v={"Content-Type":"application/json",Authorization:`Bearer ${o}`};r==="openrouter"&&(v["HTTP-Referer"]="https://risuai.xyz",v["X-Title"]="Inlay Nexus"),m=await Pe(c,{method:"POST",headers:v,body:JSON.stringify(y),signal:d?.signal})}const g=Number(m?.status||0);let h;try{h=await m.json()}catch{h={}}if(g>=400)throw p.fail(new Error(`HTTP ${g}`),{status:g,body:JSON.stringify(h).slice(0,200),provider:r}),new Error(`LLM HTTP ${g}: ${JSON.stringify(h).slice(0,500)}`);const _=r==="anthropic_compatible"?_f(h):hf(h);return p.end({message:a,status:g,bytes:_.length,provider:r}),_}catch(m){throw p.fail(m,{model:a,provider:r}),m}finally{clearTimeout(f)}}async function Tf(e,t,n,r=""){const a=Rt();if(!a||typeof a.runLLMModel!="function")throw new Error("RisuAI runLLMModel API를 사용할 수 없습니다. Risu를 최신으로 업데이트하세요.");const i=n==="main"?"model":"otherAx",o=Math.max(5e3,Number(e.timeout_seconds??180)*1e3),s=l(r)||"",c=se("llm.call");w("llm.call.start",{message:`risu:${i}`,msgs:t?.length||0,timeout_ms:o,source:n,static_model:s});let u;const d=new Promise((f,p)=>{u=setTimeout(()=>p(new Error(`Risu LLM timeout ${o}ms (${i})`)),o)});try{const f=await Promise.race([a.runLLMModel({mode:i,...s?{staticModel:s}:{},allowPlugins:!0,messages:t}),d]),p=l(await yf(f));if(!p)throw new Error(`Risu LLM(${i}) 응답이 비어 있습니다.`);return c.end({message:`risu:${i}`,bytes:p.length}),p}catch(f){throw c.fail(f,{mode:i}),f}finally{u!==void 0&&clearTimeout(u)}}var Va=C((()=>{W(),Dt(),F(),Nt(),Cf(),kr(),Ha()})),Of=sn({catalogSha:()=>Rn,curationStatus:()=>Un,curationTaggerSystemMessage:()=>fc,embedCurationCatalog:()=>lc,getCurationMode:()=>Er,getCurationStrictIds:()=>jr,getEmbedProgress:()=>oc,getEmbeddingSettingsFromConfig:()=>zn,loadCurationCatalog:()=>ut,refineShotsWithCuration:()=>mc,resetCurationCatalog:()=>cc,saveCurationCatalog:()=>sc,snapShotsSceneTags:()=>hc,testCurationEmbedding:()=>uc,updateCurationSettings:()=>_c});function oc(){return{...rn}}function Er(){const e=$(),t=e.curation&&typeof e.curation=="object"?e.curation:{},n=va(t.mode);if(n!=="off")return n;const r=e.card;return r?.composition_curation===!0||r?.composition_curation==="true"||r?.composition_curation===1?"two_stage":"off"}function jr(){const e=$(),t=e.curation&&typeof e.curation=="object"?e.curation:{};return xa(t.strict_ids)}function zn(){const e=$(),t=e.curation&&typeof e.curation=="object"?e.curation:{},n=t.embedding&&typeof t.embedding=="object"?t.embedding:{},r=Me(n.provider);return{provider:r,model:l(n.model,200)||Dn(r),endpoint:l(n.endpoint,500)||vr(r),api_key:l(n.api_key,4e3)}}async function ut(){const e=await Se(Vn);if(e==null||e==="")return Ba();try{const t=typeof e=="string"?JSON.parse(e):e;return Pa(t)}catch(t){return w("curation.catalog.load",{message:String(t?.message||t)},"warn"),Ba()}}async function sc(e){const t=Pa(e);await Ae(Vn,t);const n=await Ya();return n&&(n.catalog_sha,t.sha),{ok:!0,status:await Un()}}async function cc(){const e=Ba();return await Ae(Vn,e),await le(Yn),{ok:!0,status:await Un()}}async function Ya(){const e=await Se(Yn);if(e==null||e==="")return null;try{const t=typeof e=="string"?JSON.parse(e):e;if(!t||typeof t!="object")return null;const n=t;return Array.isArray(n.items)?n:null}catch{return null}}async function Un(){const e=await ut(),t=await Ya(),n=Id(e);let r="missing";if(t?.items?.length){r=t.catalog_sha===e.sha?"ready":"stale";const a=zn(),i=l(a.model);i&&t.model&&t.model!==i&&(r="stale")}return{mode:Er(),catalog_name:e.name,catalog_sha:e.sha||Rn(e),option_count:n,group_count:e.groups.length,has_presets:Ln(e),embed_status:r,embed_count:t?.items?.length||0,embed_model:t?.model||"",embed_updated_at:t?.updated_at||0,large_warning:n>yc,embed_progress:oc()}}async function lc(e){const t=await ut(),n=vd(t),r=zn();if(!n.length)throw new Error("임베딩할 카탈로그 항목이 없습니다.");if(Me(r.provider)!=="ollama"&&Me(r.provider)!=="lmstudio"&&!l(r.api_key))throw new Error("임베딩 API key가 없습니다. 큐레이팅 탭에서 키를 저장하세요.");const a=(c,u,d)=>{rn={running:c<u,done:c,total:u,message:d},e?.(c,u,d)},i=Me(r.provider)==="ollama"?1:16,o=[];let s=r.model;a(0,n.length,"임베딩 시작…");try{for(let u=0;u<n.length;u+=i){const d=n.slice(u,u+i);a(u,n.length,`임베딩 중… ${u}/${n.length}`);const{vectors:f,model:p}=await Ja(r,d.map(m=>m.text));s=p||s;for(let m=0;m<d.length;m++){const g=d[m],h=f[m];if(!h?.length)throw new Error(`임베딩 실패: ${g.key}`);o.push({key:g.key,groupId:g.groupId,optionId:g.optionId,tags:g.tags,slot:g.slot,vector:h})}}a(n.length,n.length,"저장 중…");const c={catalog_sha:t.sha||Rn(t),model:s,provider:String(r.provider),updated_at:Date.now()/1e3,items:o};return await Ae(Yn,c),a(n.length,n.length,"완료"),rn={running:!1,done:n.length,total:n.length,message:"완료"},{ok:!0,status:await Un()}}catch(c){throw rn={running:!1,done:rn.done,total:n.length,message:`실패: ${c?.message||c}`},c}}async function uc(){const e=zn();return lf(e)}function dc(e){return!!(e.base||e.char||e.primary||e.secondary||e.female||e.male)}async function fc(){const e=Er();if(e==="off")return null;if(e==="embed_snap")return l(await ue("curation_embed_hint"),4e3)||Sd();const t=await ut(),n=jr();return Ln(t)?Kd(t,n):xd(t,n)}async function mc(e,t){if(!e.length)return;const n=l(t?.chatContext,1e5),r=await ut();if(Ln(r)){for(const a of e)$d(a);if(e.some(a=>!!za(r,{preset_path:a.preset_path,composition_id:a.composition_id,composition_variant:a.composition_variant}))){await Lf(r,e,n);return}w("curation.preset_refine",{message:"no composition_id on shots → falling back to group refine"},"warn")}await Pf(r,e,n)}function pc(e,t,n){const r=[{role:"system",content:e}];return t&&r.push({role:"user",content:t}),r.push({role:"user",content:JSON.stringify(n)}),r}async function Pf(e,t,n){const r=jr(),a=g=>{const h=g.curation_groups;return Array.isArray(h)?h.map(_=>l(_,160)).filter(Boolean):l(h,400).split(/[,|]/).map(_=>_.trim()).filter(Boolean)},i=t.map(a),o=[...new Set(i.flat())];if(!o.length){w("curation.group_refine",{message:"no curation_groups on shots — skip"},"warn");return}const s=kd(e,o,{strictIds:r}),c=`${l(await ue("curation_refine"),6e3)||s}

${s}`,u=xs(t,n),d={shots:t.map((g,h)=>({shot_index:h,y_percent:g.y_percent??g.anchor_percent??null,...u[h],curation_groups:i[h],camera:g.camera||"",situation:g.situation||g.scene||"",place:g.place||"",action:g.action||"",natural:g.natural||"",character_count:Array.isArray(g.characters)?g.characters.length:0,cast:Rs(g)}))},f=await nn($().llm,pc(c,n,d)),p=qr(f);if(!p||typeof p!="object")return;gc(t,p,(g,h)=>{if(!h||typeof h!="object")return;const _=h.curation_option_ids??h.option_ids,y=Bs(e,_);dc(y)?(Ra(g,y,{place:h.place!=null?h.place:g.place,situation:""}),g.curation_option_ids=_):(h.place!=null&&(g.place=l(h.place,400)),r||(h.camera!=null&&(g.camera=l(h.camera,600)),h.situation!=null&&(g.situation=l(h.situation,600)),h.action!=null&&(g.action=l(h.action,600)))),r&&Array.isArray(h.characters)&&Fs(g,Ds(h.characters),e)})}async function Lf(e,t,n){const r=jr(),a=t.map(f=>za(e,{preset_path:f.preset_path,composition_id:f.composition_id,composition_variant:f.composition_variant}));if(!a.some(Boolean))return;const i=Hd(e,a.filter(Boolean),{strictIds:r}),o=xs(t,n),s={shots:t.map((f,p)=>({shot_index:p,y_percent:f.y_percent??f.anchor_percent??null,...o[p],composition_id:f.composition_id||"",composition_variant:f.composition_variant||"",place:f.place||"",natural:f.natural||"",character_count:Array.isArray(f.characters)?f.characters.length:0,cast:Rs(f)}))};let c=null;try{const f=await nn($().llm,pc(i,n,s));c=qr(f)}catch(f){w("curation.preset_refine",{message:String(f?.message||f)},"warn")}const u=new Map,d=(f,p,m)=>{const g=p&&typeof p=="object"?p.curation_option_ids??p.option_ids:f.curation_option_ids,h=g!=null?Es(e,g):[];for(const x of Rd(e,a[m])){const A=[...x.include_options||[],...x.action?.include_options||[]];A.length&&u.set(x.ref,{ids:A,binding:x})}const _=[...u.values()].flatMap(x=>x.ids),y=[...u.values()].map(x=>x.binding),v=Ud(e,{preset_path:f.preset_path,composition_id:f.composition_id,composition_variant:f.composition_variant,curation_option_ids:h},{optionIds:_,bindings:y});if(v&&dc(v)&&(Ra(f,v,{place:p&&p.place!=null?p.place:f.place,situation:""}),g!=null&&(f.curation_option_ids=h),e.fixed_positive&&(f.curation_fixed_positive=e.fixed_positive)),r){const x=p&&typeof p=="object"?p.characters:void 0;Array.isArray(x)&&Fs(f,Ds(x),e)}};if(c&&typeof c=="object"){gc(t,c,d);return}t.forEach((f,p)=>d(f,null,p))}function gc(e,t,n){const r=Array.isArray(t.shots)?t.shots:Array.isArray(t)?t:null;if(r){for(let a=0;a<e.length;a++){const i=r.find(o=>o&&typeof o=="object"&&Number(o.shot_index)===a);n(e[a],i||r[a],a)}return}e.length===1&&n(e[0],t,0)}async function hc(e){if(!e.length)return{ok:!0,snapped:0};const t=await ut(),n=await Ya(),r=t.sha||Rn(t);if(!n?.items?.length)return{ok:!1,reason:"임베딩 없음 → 큐레이션 없이 생성"};if(n.catalog_sha!==r)return{ok:!1,reason:"임베딩 stale → 큐레이션 없이 생성"};const a=e.map(o=>{const s=N(l(o.camera,600),l(o.situation||o.scene,600),l(o.place,400),l(o.action,600));return Xd(s)}),i=a.flat();if(!i.length)return{ok:!0,snapped:0};try{const o=zn(),{vectors:s}=await Ja(o,i);let c=0,u=0;for(let d=0;d<e.length;d++){const f=a[d],p=s.slice(c,c+f.length);if(c+=f.length,!f.length)continue;const{baseTags:m,charTags:g,primaryTags:h,secondaryTags:_,femaleTags:y,maleTags:v,snapped:x}=Zd(f,p,n.items);u+=x,Ra(e[d],{base:N(...m),char:N(...g),primary:N(...h),secondary:N(..._),female:N(...y),male:N(...v)},{place:"",situation:""})}return{ok:!0,snapped:u}}catch(o){const s=`임베딩 API 실패 → 큐레이션 없이 생성 (${o?.message||o})`;return w("curation.snap",{message:s},"warn"),{ok:!1,reason:s}}}async function _c(e){const t=$(),n=t.curation&&typeof t.curation=="object"?{...t.curation}:{},r={...n,...e};if(e.mode!=null&&(r.mode=va(e.mode)),e.strict_ids!=null&&(r.strict_ids=xa(e.strict_ids)),e.embedding&&typeof e.embedding=="object"){const a=n.embedding&&typeof n.embedding=="object"?{...n.embedding}:{},i=e.embedding,o={...a,...i};if("api_key"in i){const s=i.api_key;delete o.api_key,delete o.api_key_configured,l(s)&&(o.api_key=s),(i.clearApiKey||e.clear_embedding_key)&&(o.api_key=""),delete o.clearApiKey}o.provider!=null&&(o.provider=Me(o.provider)),r.embedding=o}return t.curation=r,e.mode!=null&&t.card&&typeof t.card=="object"&&(t.card.composition_curation=!1),rr(t),await Je(),{ok:!0}}var yc,rn,Jn=C((()=>{fd(),Fa(),qd(),On(),ef(),X(),W(),F(),Ws(),yt(),mr(),he(),lt(),Va(),yc=400,rn={running:!1,done:0,total:0,message:""}}));Jn(),X(),W(),gt(),ce(),Nt();async function $r(e,t,n,r=1,a=3){const i=ze(n),o=Math.max(0,Math.min(1,Number(r)||1)),s={image:await Ze(t),information_extracted:o,model:i};let c="";for(let u=1;u<=a;u++)try{w("nai.encode_vibe.start",{message:i,ie:o,attempt:u,focus:!0});const d=await Pe(Si,{method:"POST",headers:{Authorization:`Bearer ${e}`,"Content-Type":"application/json"},body:JSON.stringify(s)}),f=Number(d?.status||0);if([502,503,504,520].includes(f)){c=`HTTP ${f}`,await Ye(2*u*1e3);continue}if(f<200||f>=300){let g="";try{g=typeof d?.text=="function"?await d.text():""}catch{}if(c=`HTTP ${f}: ${String(g).slice(0,200)}`,u<a){await Ye(1e3);continue}break}const p=await Qt(d,{timeoutMs:6e4}),m=await Ze(p);return w("nai.encode_vibe.done",{message:i,bytes:p?.byteLength||0,focus:!0}),m}catch(d){if(c=String(d?.message||d),u<a){await Ye(1e3);continue}}throw new Error(`encode-vibe 실패 (${a}회): ${c}`)}X(),F(),$e(),he(),lt();var Za=12582912,Ke=32;async function Bf(){const e=await D("meta","reference_image");return!!(e?.png&&e.png.byteLength>Ke)}async function bc(){return(await D("meta","reference_image"))?.png||null}async function Rf(e){if(!e||e.byteLength<Ke)throw new Error("참조 이미지가 비어 있습니다");if(e.byteLength>Za)throw new Error("참조 이미지가 너무 큽니다 (최대 12MB)");return await R("meta",{key:"reference_image",png:e}),Vr(Mt(e)),$().nai.image_reference="file",await Je(),{ok:!0,image_reference:"file",configured:!0,bytes:e.byteLength,preview_url:"/v1/nai/reference.png"}}async function wc(){return await xt("meta","reference_image"),Vr(""),$().nai.image_reference="none",await Je(),{ok:!0,image_reference:"none",configured:!1}}async function Df(){const e=await D("meta","vibe_transfer");return!!(e?.encoded&&e?.png&&e.png.byteLength>Ke)}async function Ff(){return await D("meta","vibe_transfer")||null}async function zf(){return(await D("meta","vibe_transfer"))?.png||null}function Cr(e){let t=Number(e??1);return Number.isNaN(t)&&(t=1),Math.max(0,Math.min(1,t))}async function Uf(e,t={}){if(!e||e.byteLength<Ke)throw new Error("Vibe 이미지가 비어 있습니다");if(e.byteLength>Za)throw new Error("Vibe 이미지가 너무 큽니다 (최대 12MB)");const n=$(),r=l(n.nai.api_key);if(!r)throw new Error("NAI api_key가 설정되지 않았습니다. encode-vibe에 키가 필요합니다.");const a=Ue(t.model||n.nai.model||"nai-diffusion-4-5-full"),i=Cr(t.information_extracted??n.nai.vibe_transfer_information_extracted),o=await $r(r,e,a,i);return await R("meta",{key:"vibe_transfer",png:e,encoded:o,model:ze(a),information_extracted:i}),Yr(Mt(e)),n.nai.vibe_transfer="file",t.strength!=null&&!Number.isNaN(Number(t.strength))&&(n.nai.vibe_transfer_strength=Math.max(0,Math.min(1,Number(t.strength)))),n.nai.vibe_transfer_information_extracted=i,await Je(),{ok:!0,vibe_transfer:"file",configured:!0,bytes:e.byteLength,encoded_bytes:o.length,model:ze(a),information_extracted:i,preview_url:"/v1/nai/vibe.png"}}async function vc(){return await xt("meta","vibe_transfer"),Yr(""),$().nai.vibe_transfer="none",await Je(),{ok:!0,vibe_transfer:"none",configured:!1}}async function Jf(){const e=await Ff();if(!e?.png||e.png.byteLength<Ke)return null;const t=$(),n=l(t.nai.api_key);if(!n)throw new Error("NAI api_key가 설정되지 않았습니다.");const r=ze(Ue(t.nai.model||"nai-diffusion-4-5-full")),a=Cr(t.nai.vibe_transfer_information_extracted);if(!(!l(e.encoded)||l(e.model)!==r||Math.abs(Number(e.information_extracted??1)-a)>.001))return e;const i=await $r(n,e.png,r,a),o={...e,key:"vibe_transfer",encoded:i,model:r,information_extracted:a};return await R("meta",o),o}async function xc(e){const t=l(e,120);return t&&await D("meta",Lt(t))||null}async function Kf(e,t,n={}){const r=l(e,120);if(!r)throw new Error("preset_id required");if(!t||t.byteLength<Ke)throw new Error("Vibe 이미지가 비어 있습니다");if(t.byteLength>Za)throw new Error("Vibe 이미지가 너무 큽니다 (최대 12MB)");const a=$(),i=l(a.nai.api_key);if(!i)throw new Error("NAI api_key가 설정되지 않았습니다. encode-vibe에 키가 필요합니다.");const o=Ue(n.model||a.nai.model||"nai-diffusion-4-5-full"),s=Cr(n.information_extracted??a.nai.vibe_transfer_information_extracted),c=await $r(i,t,o,s),u=Lt(r);await R("meta",{key:u,png:t,encoded:c,model:ze(o),information_extracted:s});const d=Mt(t);return ar(r,d),{ok:!0,preset_id:r,vibe_transfer:"file",configured:!0,bytes:t.byteLength,encoded_bytes:c.length,model:ze(o),information_extracted:s,preview_url:d}}async function kc(e){const t=l(e,120);if(!t)throw new Error("preset_id required");return await xt("meta",Lt(t)),ar(t,""),{ok:!0,preset_id:t,vibe_transfer:"none",configured:!1}}async function Gf(e,t){const n=await xc(e);if(!n?.png||n.png.byteLength<Ke)return!1;const r=l(t,120);if(!r)return!1;await R("meta",{key:Lt(r),png:n.png,encoded:n.encoded||"",model:n.model||"",information_extracted:n.information_extracted??1});const a=Zr(e)||(n.png?Mt(n.png):"");return a&&ar(r,a),!0}async function Hf(e){const t=await xc(e);if(!t?.png||t.png.byteLength<Ke)return null;const n=$(),r=l(n.nai.api_key);if(!r)throw new Error("NAI api_key가 설정되지 않았습니다.");const a=ze(Ue(n.nai.model||"nai-diffusion-4-5-full")),i=Cr(n.nai.vibe_transfer_information_extracted);if(!(!l(t.encoded)||l(t.model)!==a||Math.abs(Number(t.information_extracted??1)-i)>.001))return t;const o=await $r(r,t.png,a,i),s=Lt(l(e,120)),c={...t,key:s,encoded:o,model:a,information_extracted:i};return await R("meta",c),c}async function qf(){for(const e of await ye("meta")){const t=String(e?.key||"");if(!Bt(t))continue;const n=e.png;!n||n.byteLength<Ke||ar(pn(t),Mt(n))}}Ut(),On(),X(),W(),F(),Gt(),rt(),$a(),$e(),he(),lt();function Sc(e,t){const n=Number(e);return Math.max(1,Math.min(5e3,Number.isFinite(n)&&n>0?Math.round(n):t))}async function Tr(e){const{shot:t,roster:n}=e,r=$().card,a=$().nai,i=nt(r),o=ia(t.characters||[],n,i).slice(0,i),s=Math.max(1,o.length),c=Co(r.person_tag_mode,r.auto_person_tags),u=Yl(Zl(o,n,c),r.person_tag_weight),[d,f]=pl(await ue("preset_1")),p=Array.isArray(r.presets)?r.presets:[],m=l(r.active_preset_id,120);let g=null;p.length&&(m&&(g=p.find(Y=>typeof Y=="object"&&l(Y.id,120)===m)||null),!g&&typeof p[0]=="object"&&(g=p[0]));let h,_;g?(h=l(g.positive||g.pos||""),_=l(g.negative||g.neg||"")):(h=N(l(r.custom_pos),d),_=N(l(r.custom_neg),f));let y=t.situation||t.scene;const v=l(e.lockedSetup||"");let x;v?x=v:(x=N(t.camera,y,t.place,t.action),r.mode==="asset"&&(x=N(x,"white background","simple background","cowboy shot","looking at viewer","portrait")));const A=ka(r.natural_base),O=A==="supplement"?600:A==="detailed"?480:400,E=A==="off"?"":l(t.natural||t.natural_base||t.nl||"",O);let M="",j="";if(l(t.composition_id,160)||l(t.curation_fixed_positive,200))try{const Y=await ut();M=l(t.curation_fixed_positive,800)||l(Y.fixed_positive,800),j=l(Y.fixed_negative,800)}catch{M=l(t.curation_fixed_positive,800)}let S=N(h,E,x,M);c!=="off"&&(S=$o(S),x=$o(x));let I=u?S?`${u}, ${S}`:u:S;const P=Ue(a.model||"nai-diffusion-4-5-full");a.apply_quality_tags!==!1&&(I+=kn[P]||"");const U=l(a.uc_preset)||"human_focus",Z=N(_,j,(ho[P]||{})[U]||""),Le=[],G=[];for(let Y=0;Y<o.length;Y++){const K=o[Y],qe=l(K.name,200),re=qe?_e(qe,n):null,ft=N(Xl(re,K)),q=l(K.negative),Be=s===1?.5:Math.round((.1+.8*Y/Math.max(1,s-1))*10)/10,ae=.5;Le.push({prompt:ft||"girl",uc:q,center_x:Be,center_y:ae}),G.push({name:re?.name||qe,prompt:ft,uc:q,center_x:Be,center_y:ae,raw:K})}return{main:I,neg:Z,captions:Le,meta:{setup:x,person:u,characters:G,paragraph:t.paragraph}}}async function Ac(e){const t=$().nai,n=e.captions;if(Pn(t)==="comfy"){const[_,y]=await rd(t,e.main,e.neg,n);return{bytes:_,seed:y}}const r=l(t.api_key);if(!r)throw new Error("NAI api_key가 설정되지 않았습니다.");const a=[],i=l(t.image_reference||"none").toLowerCase();if(!["","none","off","false","0"].includes(i)){const _=await bc();if(_){let y=l(t.image_reference_type||"character&style")||"character&style";["character","style","character&style"].includes(y)||(y="character&style");let v=Number(t.image_reference_strength??.6),x=Number(t.image_reference_fidelity??1);Number.isNaN(v)&&(v=.6),Number.isNaN(x)&&(x=1),a.push({image:_,type:y,strength:Math.max(0,Math.min(1,v)),fidelity:Math.max(0,Math.min(1,x))})}}const o=$().card,s=Array.isArray(o.presets)?o.presets:[],c=l(o.active_preset_id,120);let u=null;s.length&&(c&&(u=s.find(_=>typeof _=="object"&&l(_.id,120)===c)||null),!u&&typeof s[0]=="object"&&(u=s[0]));const d=l(u?.id||c,120),f=Uu(t,u),p=[];let m=d?await Hf(d):null;if(!m){const _=l(t.vibe_transfer||"none").toLowerCase();["","none","off","false","0"].includes(_)||(m=await Jf())}if(m?.encoded){let _=Number(t.vibe_transfer_strength??.6),y=Number(t.vibe_transfer_information_extracted??m.information_extracted??1);Number.isNaN(_)&&(_=.6),Number.isNaN(y)&&(y=1),p.push({encoded:m.encoded,strength:Math.max(0,Math.min(1,_)),information_extracted:Math.max(0,Math.min(1,y))})}const g={prompt:e.main,negative_prompt:e.neg,width:Sc(t.width,832),height:Sc(t.height,1216),seed:Number(t.seed??0)||0,steps:Math.min(Number(t.steps??28)||28,28),cfg_scale:f.cfg_scale,cfg_rescale:f.cfg_rescale,sampler:l(t.sampler)||"k_euler_ancestral",scheduler:l(t.scheduler)||"karras",model:Ue(t.model||"nai-diffusion-4-5-full"),var_plus:!!t.variety_plus,characters:n,character_refs:a,vibes:p};w("nai.generate.dims",{message:`${g.width}x${g.height}`,steps:g.steps,focus:!0}),g.seed||(g.seed=Math.floor(Math.random()*4294967295)||1);const h=l(t.request_url)||"https://image.novelai.net/ai/generate-image";return{bytes:(await vs(r,g,h,{timeoutMs:9e4})).raw_bytes,seed:g.seed||0}}function Wf({imageId:e,sessionId:t,request:n,shotIndex:r,paragraph:a,yPercent:i,contentHash:o=""}){return{version:1,image_id:l(e,80),session_id:l(t,200),unified_session_id:l(n.unified_session_id||"",200),character_id:l(n.character_id||"",200),character_name:l(n.character_name||"",200),chat_id:l(n.chat_id||"",200),chat_name:l(n.chat_name||"",200),char_index:L(n.char_index,-1),chat_index:L(n.chat_index,-1),message_index:L(n.message_index,-1),message_role:l(n.message_role||n.role||"",40).toLowerCase(),shot_index:L(r,0),paragraph:L(a,0),y_percent:i,content_hash:l(o||n.content_hash||"",128),assistant_preview:l(n.assistant_text||"",Xe)}}async function Tt(e){return _u(e)}async function Mc(e,t){const n=await D("images",e),r=n?{...n}:{id:e},a=t||{};r.location={...a,version:Number(a.version||1),image_id:l(e,80)},await R("images",r)}async function dt(e,t={}){const n=await Tt(e),r=typeof t=="object"&&t?t:{};let a=n.y_percent;a==null&&(a=r.y_percent??r.anchor_percent??r.read_percent);const i=Object.keys(n).length>0,o=Ie(l(e,80));return{character_id:l(n.character_id||r.character_id||"",200),chat_id:l(n.chat_id||r.chat_id||"",200),character_name:l(n.character_name||r.character_name||"",200),chat_name:l(n.chat_name||r.chat_name||"",200),char_index:L(n.char_index??r.char_index,-1),chat_index:L(n.chat_index??r.chat_index,-1),message_index:L("message_index"in n?n.message_index:r.message_index,-1),message_role:l(n.message_role||r.message_role||"",40).toLowerCase(),shot_index:L(n.shot_index,-1),paragraph:L("paragraph"in n?n.paragraph:r.paragraph,0),y_percent:tr(a),content_hash:l(n.content_hash||r.content_hash||"",128),assistant_preview:l(n.assistant_preview||r.assistant_preview||"",Xe),unified_session_id:l(n.unified_session_id||r.unified_session_id||"",200),location_file:i?`idb:${o}`:"",storage:"indexeddb",storage_key:o}}function Xa(e,t,n=0){const r=typeof e=="object"&&e?{...e}:{},a=t||{};return{...r,character_id:l(a.character_id||r.character_id||"",200),chat_id:l(a.chat_id||r.chat_id||"",200),character_name:l(a.character_name||r.character_name||"",200),chat_name:l(a.chat_name||r.chat_name||"",200),char_index:L(a.char_index??r.char_index,-1),chat_index:L(a.chat_index??r.chat_index,-1),message_index:L(a.message_index??r.message_index,-1),message_role:l(a.message_role||r.message_role||"",40).toLowerCase(),content_hash:l(a.content_hash||r.content_hash||"",128),assistant_preview:l(a.assistant_preview||r.assistant_preview||"",Xe),unified_session_id:l(a.unified_session_id||r.unified_session_id||"",200),y_percent:tr(a.y_percent??r.y_percent),storage:"indexeddb",storage_key:Ie(l(a.image_id||"",80)),png_bytes:Number(n)||0}}ce();var Vf=(()=>{const e=new Uint32Array(256);for(let t=0;t<256;t+=1){let n=t;for(let r=0;r<8;r+=1)n=n&1?3988292384^n>>>1:n>>>1;e[t]=n>>>0}return e})();function Qa(e){return Array.isArray(e)?new Uint8Array(e):pe(e)}function Yf(e){const t=Qa(e);let n=4294967295;for(let r=0;r<t.length;r+=1)n=Vf[(n^t[r])&255]^n>>>8;return(n^4294967295)>>>0}function J(e){const t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e>>>0,!0),t}function de(e){const t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e>>>0,!0),t}function Kn(e){let t=0;for(const n of e)t+=n.length;return wn(e,t)}function Zf(e){return new TextEncoder().encode(String(e??""))}function Xf(e=[]){const t=[],n=[];let r=0;for(const o of e){const s=Zf(o.name||"file"),c=Qa(o.data),u=Yf(c),d=Kn([de(67324752),J(20),J(0),J(0),J(0),J(0),de(u),de(c.length),de(c.length),J(s.length),J(0),s,c]),f=Kn([de(33639248),J(20),J(20),J(0),J(0),J(0),J(0),de(u),de(c.length),de(c.length),J(s.length),J(0),J(0),J(0),J(0),de(0),de(r),s]);t.push(d),n.push(f),r+=d.length}const a=Kn(n),i=Kn([de(101010256),J(0),J(0),J(e.length),J(e.length),de(a.length),de(r),J(0)]);return Kn([...t,a,i])}function ei(e,t){return e[t]|e[t+1]<<8}function Nc(e,t){return(e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24)>>>0}function Qf(e){const t=Qa(e),n=new Map;let r=0;for(;r+30<=t.length;){const a=Nc(t,r);if(a===33639248||a===101010256)break;if(a!==67324752){r+=1;continue}const i=ei(t,r+8),o=Nc(t,r+18),s=ei(t,r+26),c=ei(t,r+28),u=r+30,d=new TextDecoder().decode(t.subarray(u,u+s)),f=u+s+c,p=f+o;if(p>t.length)break;i===0&&n.set(d.replace(/\\/g,"/"),t.subarray(f,p)),r=p}return n}function em(e=[],{exportedAt:t=Date.now()}={}){return{format:"inlay-nexus-gallery",version:1,exported_at:t,items:(e||[]).map(n=>({id:String(n.id||""),file:`images/${String(n.id||"unknown")}.png`,location:{character_id:n.character_id||"",chat_id:n.chat_id||"",character_name:n.character_name||"",chat_name:n.chat_name||"",char_index:n.char_index??-1,chat_index:n.chat_index??-1,message_index:n.message_index??-1,content_hash:n.content_hash||"",paragraph:n.paragraph??0,shot_index:n.shot_index??0,y_percent:n.y_percent??null,assistant_preview:n.assistant_preview||"",session_id:n.session_id||""},meta:{main_prompt:n.main_prompt||"",seed:n.seed??null,created_at:n.created_at??null,characters:n.characters||[]}}))}}function tm(e,t=[]){const n=e?.location||{},r=String(n.content_hash||"").trim(),a=t||[];if(r){const u=a.find(d=>String(d.content_hash||"")===r);if(u)return{status:"exact",matchId:String(u.id),content_hash:r}}const i=String(n.character_id||""),o=String(n.chat_id||""),s=Number(n.message_index),c=a.filter(u=>i&&String(u.character_id||"")!==i||o&&String(u.chat_id||"")!==o||Number.isFinite(s)&&s>=0&&Number(u.message_index)!==s?!1:!!(i||o||Number.isFinite(s)&&s>=0)).slice(0,8);return c.length?{status:"candidate",candidates:c.map(u=>({id:u.id,content_hash:u.content_hash,message_index:u.message_index})),location:n}:{status:"orphan",location:n}}function nm(e=[]){return Xf(e)}function rm(e){const t=Qf(e);let n=null;const r=t.get("manifest.json");if(r)try{n=JSON.parse(new TextDecoder().decode(r))}catch{n=null}const a=new Map;for(const[i,o]of t.entries())i!=="manifest.json"&&/\.(png|webp|jpe?g)$/i.test(i)&&a.set(i.replace(/\\/g,"/"),o);return{manifest:n,images:a,files:t}}X(),W(),ce(),F(),$e();function Gn(e){try{const t=JSON.parse(e.meta_json||"{}");return t&&typeof t=="object"?t:{}}catch{return{}}}async function Ic(e,t){return(await pu(e))?.png_bytes||Number(t.png_bytes)||0}async function ti(e){const t=(await ye("cards")).sort((i,o)=>(o.created_at||0)-(i.created_at||0)).slice(0,Math.max(1,Math.min(2e3,e))),n={},r=[];for(const i of t){const o=Gn(i),s=await dt(i.id,o),c=await Tt(i.id),u=l(s.character_name||c.character_name||o.character_name||"",200),d=l(s.chat_name||c.chat_name||o.chat_name||"",200),f=l(s.character_id||"",200)||"unknown",p=l(s.chat_id||"",200)||"unknown",m=`${f}|${p}`;let g=n[m];g||(g={key:m,character_id:f,chat_id:p,character_name:u||f.slice(0,12)||"Unknown",chat_name:d||`chat ${s.chat_index??"?"}`,char_index:s.char_index??-1,chat_index:s.chat_index??-1,count:0,storage:"indexeddb"},n[m]=g),u&&!g.character_name&&(g.character_name=u),d&&(g.chat_name=d),g.count+=1,r.push({id:i.id,job_id:i.job_id,session_id:i.session_id,folder_key:m,shot_index:s.shot_index>=0?s.shot_index:i.shot_index,paragraph:Object.keys(c).length?s.paragraph:i.paragraph,y_percent:s.y_percent,message_index:s.message_index??-1,message_role:s.message_role||"",content_hash:s.content_hash||"",character_id:f,character_name:g.character_name,chat_id:p,chat_name:g.chat_name,char_index:s.char_index??-1,chat_index:s.chat_index??-1,assistant_preview:l(s.assistant_preview||c.assistant_preview||o.assistant_preview||"",Xe),main_prompt:i.main_prompt,characters:JSON.parse(i.characters_json||"[]"),image_url:Ce(i.id),seed:i.seed,created_at:i.created_at,storage:"indexeddb",storage_key:s.storage_key||Ie(i.id),location_file:s.location_file||"",png_bytes:await Ic(i.id,o)})}const a={ok:!0,folders:Object.values(n).sort((i,o)=>`${i.character_name||""}`.localeCompare(`${o.character_name||""}`,void 0,{sensitivity:"base"})||`${i.chat_name||""}`.localeCompare(`${o.chat_name||""}`,void 0,{sensitivity:"base"})),items:r,total:r.length,storage:"indexeddb",storage_api:"getLocalPluginStorage"};return await it(a,{cachedOnly:!0}),a}async function am(e=400){return ti(e)}async function im(e,t=40){const n=(await Xo(e)).sort((i,o)=>(o.created_at||0)-(i.created_at||0)).slice(0,Number(t)),r=[];for(const i of n){const o=Gn(i),s=await dt(i.id,o),c=await Tt(i.id);r.push({id:i.id,job_id:i.job_id,shot_index:s.shot_index>=0?s.shot_index:i.shot_index,paragraph:Object.keys(c).length?s.paragraph:i.paragraph,y_percent:s.y_percent,message_index:s.message_index??-1,message_role:s.message_role||"",content_hash:s.content_hash||"",character_id:s.character_id||"",chat_id:s.chat_id||"",character_name:s.character_name||"",chat_name:s.chat_name||"",char_index:s.char_index??-1,chat_index:s.chat_index??-1,assistant_preview:s.assistant_preview||o.assistant_preview||"",main_prompt:i.main_prompt,negative_prompt:i.negative_prompt,characters:JSON.parse(i.characters_json||"[]"),image_url:Ce(i.id),seed:i.seed,created_at:i.created_at,storage:"indexeddb",storage_key:s.storage_key||Ie(i.id),png_bytes:await Ic(i.id,o)})}const a={ok:!0,session_id:e,items:r,storage:"indexeddb"};return await it(a,{cachedOnly:!0}),a}async function om(e={}){const t=l(e.session_id,200),n=l(e.to_hash,128),r=l(e.assistant_preview||"",Xe),a=(Array.isArray(e.card_ids)?e.card_ids:[]).map(o=>l(o,80)).filter(Boolean);if(!n||!a.length)return{ok:!1,...te("to_hash and card_ids required","bad_request"),rebound:0,ids:[]};const i=[];for(const o of a){const s=await D("cards",o);if(!s||t&&l(s.session_id||"",200)!==t)continue;const c=Gn(s),u=await Tt(o),d={...u,image_id:o,content_hash:n,assistant_preview:r||u.assistant_preview||""};await Mc(o,d),c.content_hash=n,r&&(c.assistant_preview=r),c.message_role=l(c.message_role||u.message_role||"",40).toLowerCase(),s.meta_json=JSON.stringify(c),await R("cards",s),i.push(o)}return w("gallery.rebind",{n:i.length,to:n.slice(0,8)}),{ok:!0,rebound:i.length,ids:i,content_hash:n}}async function ni(e,t="",n=null){const r=l(e,200),a=l(t);let i=null;try{n!=null&&String(n).trim()!==""&&(i=parseInt(String(n),10))}catch{i=null}if(!r||!a&&i==null)return{ok:!0,unlinked:0,ids:[]};const o=(await Xo(r)).sort((c,u)=>(c.created_at||0)-(u.created_at||0)),s=[];for(const c of o){const u=Gn(c),d=await dt(c.id,u),f=l(d.content_hash||""),p=L(d.message_index,-1);let m=!1;if((a&&f&&f===a||i!=null&&i>=0&&p===i)&&(m=!0),!m)continue;const g={...await Tt(c.id),version:1,image_id:c.id,session_id:r,content_hash:"",message_index:-1,character_id:"",chat_id:"",char_index:-1,chat_index:-1,unlinked_at:Date.now()/1e3};await Mc(c.id,g),(u.content_hash||u.message_index!=null||u.assistant_preview)&&(u.content_hash="",u.assistant_preview="",u.message_index=-1,u.unlinked_at=Date.now()/1e3,c.meta_json=JSON.stringify(u),await R("cards",c)),s.push(c.id)}return{ok:!0,unlinked:s.length,ids:s}}async function ri(e){const t=l(e,80);return t?await D("cards",t)?(await xt("cards",t),await xt("images",t),{ok:!0,deleted:1,ids:[t]}):{ok:!1,...te("card not found","not_found")}:{ok:!1,...te("card_id required","bad_request")}}async function ai(e){return ri(e)}async function sm(e=[]){const t=[...new Set((e||[]).map(r=>l(r,80)).filter(Boolean))],n=[];for(const r of t)(await ri(r)).ok&&n.push(r);return{ok:!0,deleted:n.length,ids:n}}async function Ec(){const e=(await D("meta","explorer_favorites"))?.ids;return{ok:!0,ids:Array.isArray(e)?e.map(t=>l(t,80)).filter(Boolean):[]}}async function cm(e=[]){const t=[...new Set((e||[]).map(n=>l(n,80)).filter(Boolean))].slice(0,5e3);return await R("meta",{key:"explorer_favorites",ids:t,updated_at:Date.now()/1e3}),{ok:!0,ids:t}}async function lm(e={}){let t=(await ti(2e3)).items;const n=l(e.folder_key||"",400);if(!e.all)if(n)t=t.filter(o=>o.folder_key===n);else if(Array.isArray(e.card_ids)&&e.card_ids.length){const o=new Set(e.card_ids.map(s=>l(s,80)));t=t.filter(s=>o.has(s.id))}else return{ok:!1,...te("card_ids, folder_key, or all required","bad_request")};if(!t.length)return{ok:!1,...te("no images to export","empty")};const r=em(t),a=[{name:"manifest.json",data:new TextEncoder().encode(JSON.stringify(r,null,2))}];for(const o of t){const s=await jc(o.id);s?.byteLength&&a.push({name:`images/${o.id}.png`,data:pe(s)})}if(a.length<2)return{ok:!1,...te("image bytes missing","empty")};const i=nm(a);return{ok:!0,count:a.length-1,filename:`inlay-gallery-${Date.now()}.zip`,zip_base64:Ft(i),bytes:i.length}}async function um(e={}){const t=e.prefer_new_ids===void 0?!0:e.prefer_new_ids,n=String(e.zip_base64||"").replace(/^data:.*base64,/,"");if(!n)return{ok:!1,...te("zip_base64 required","bad_request")};let r;try{r=Re(n)}catch(u){return{ok:!1,...te(`invalid base64: ${u?.message||u}`,"bad_request")}}const{manifest:a,images:i}=rm(r);if(!a?.items?.length)return{ok:!1,...te("manifest.items missing","bad_request")};const o=(await ti(2e3)).items,s=[],c={exact:0,candidate:0,orphan:0,skipped:0};for(const u of a.items){const d=String(u.file||`images/${u.id}.png`).replace(/\\/g,"/"),f=i.get(d)||i.get(`images/${u.id}.png`);if(!f?.byteLength){c.skipped+=1;continue}const p=tm(u,o);c[p.status]=(c[p.status]||0)+1;const m={...u.location||{}},g=t?ht():l(u.id||"",80)||ht(),h=l(m.session_id||"",200)||`import_${ht().replace(/-/g,"").slice(0,10)}`,_={version:1,image_id:g,session_id:h,character_id:l(m.character_id||"",200),character_name:l(m.character_name||"",200),chat_id:l(m.chat_id||"",200),chat_name:l(m.chat_name||"",200),char_index:L(m.char_index,-1),chat_index:L(m.chat_index,-1),message_index:L(m.message_index,-1),shot_index:L(m.shot_index,0),paragraph:L(m.paragraph,0),y_percent:tr(m.y_percent),content_hash:l(m.content_hash||"",128),assistant_preview:l(m.assistant_preview||"",Xe),imported_at:Date.now()/1e3,reattach:p.status},y=Q(f);await pa(g,y,_);const v=Xa({...u.meta||{},assistant_preview:_.assistant_preview,imported_at:_.imported_at,reattach:p.status},_,y.byteLength||0);await R("cards",{id:g,job_id:`import_${g.slice(0,8)}`,session_id:h,shot_index:_.shot_index,paragraph:_.paragraph,main_prompt:l(u.meta?.main_prompt||"",8e3),negative_prompt:"",characters_json:JSON.stringify(u.meta?.characters||[]),seed:u.meta?.seed??0,meta_json:JSON.stringify(v),created_at:Number(u.meta?.created_at)||Date.now()/1e3}),s.push({id:g,reattach:p.status,content_hash:_.content_hash})}return{ok:!0,imported:s.length,items:s,report:c}}async function dm(e){const t=l(e,400);if(!t||!t.includes("|"))return{ok:!1,...te("folder_key required","bad_request")};const[n,r]=t.split("|",2),a=l(n,200)||"unknown",i=l(r,200)||"unknown",o=await ye("cards"),s=[];for(const c of o){const u=Gn(c),d=await dt(c.id,u),f=l(d.character_id||"",200)||"unknown",p=l(d.chat_id||"",200)||"unknown";f!==a||p!==i||(await ri(c.id)).ok&&s.push(c.id)}return{ok:!0,deleted:s.length,ids:s,folder_key:`${a}|${i}`}}async function jc(e){return vu(e)}F(),$e(),he();var fm=["queued","tagging","generating"];function Or(e={},t=""){const n=l(t||e.session_id||"",200)||"_",r=l(e.content_hash||"",128);if(r)return`${n}::h:${r}`;const a=L(e.message_index,-1);return a>=0?`${n}::m:${a}`:`${n}::all`}async function mm(e){if(ir.has(e))return"message-reroll";const t=An.get(e);if(!t?.jobId)return"";const n=bt.get(t.jobId);if(!n||n.cancelRequested)return"";const r=await D("jobs",t.jobId);return r&&fm.includes(String(r.state||""))?t.jobId:""}async function ii(e={},t=""){const n=await mm(Or(e,t));return n?{ok:!1,busy:!0,accepted:!1,job_id:n==="message-reroll"?"":n,session_id:l(t||e.session_id||"",200),job_state:"busy",error:{code:"busy",message:"같은 메시지 작업이 아직 진행 중입니다. 끝날 때까지 기다려 주세요."}}:null}var pm=sn({isCharacterImageExtraLore:()=>Ot,matchCharacterImageSectionTitles:()=>Tc,normalizeNameKey:()=>an,parseCharacterImageTagLore:()=>oi,trimCharacterImageTagLore:()=>Cc});function Ot(e){return String(e?.comment||e?.name||"").trim().toLowerCase()==="lb-xnai.lb.extra"}function oi(e){const t=String(e||"");if(!t.trim())return{header:"",sections:[]};const n=/^(#{2,3})\s+(.+?)\s*$/gm,r=[];let a;for(;(a=n.exec(t))!==null;)r.push({hashes:a[1],title:String(a[2]||"").trim(),start:a.index,titleEnd:a.index+a[0].length});if(!r.length)return{header:t.trimEnd(),sections:[]};let i=t.slice(0,r[0].start).trimEnd();const o=[];for(let s=0;s<r.length;s+=1){const c=r[s],u=s+1<r.length?r[s+1].start:t.length,d=t.slice(c.titleEnd,u).replace(/^\r?\n/,"").trimEnd();if(c.title.toLowerCase()==="character image tags"){const f=t.slice(c.start,u).trimEnd();i=i?`${i}

${f}`:f;continue}o.push({title:c.title,hashes:c.hashes,body:d})}return{header:i.trimEnd(),sections:o}}function an(e){return String(e||"").replace(/[^a-zA-Z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/g,"").toLowerCase()}function $c(e){return new Set((Array.isArray(e)?e:[]).map(t=>an(t)).filter(Boolean))}function gm(e,t){if(!t.length)return"";const n=[];e&&n.push(e);for(const r of t){const a=`${r.hashes} ${r.title}`;n.push(r.body?`${a}
${r.body}`:a)}return n.join(`

`).trimEnd()}function Cc(e,t=[],n=[]){const r=oi(e);if(!r.sections.length)return"";const a=$c(n);if(!a.size)return"";const i=$c(t),o=r.sections.filter(s=>{const c=an(s.title);return a.has(c)&&!i.has(c)});return gm(r.header,o)}function Tc(e,t,n=[]){const r=oi(e),a=an(t),i=new Set((Array.isArray(n)?n:[]).map(s=>an(s)).filter(s=>s.length>=2));if(!a&&!i.size)return[];const o=[];for(const s of r.sections){const c=an(s.title);c.length<2||(a&&a.includes(c)||i.has(c))&&o.push(s.title)}return o}F(),Gt(),rt();function Oc(e){const t=e.key||e.keys||e.trigger||"";let n;if(Array.isArray(t))n=t.map(o=>l(o,200));else{const o=l(t,2e3);n=o?o.split(/[,|\n]/):[]}const r=e.secondkey||e.second_key||"";r&&n.push(...V(r));const a=[],i=new Set;for(const o of n){const s=l(o,200),c=z(s),u=s?_t(s):"";!c||i.has(c)||s.startsWith("")||u.length<2||(i.add(c),a.push(s))}return a}function Pc(e,t,n){const r=z(e),a=_t(e);if(a.length<2)return 0;const i=(o,s)=>{if(!o||!s||s.length<2)return 0;let c=0,u=0;for(;u<=o.length-s.length;){const d=o.indexOf(s,u);if(d<0)break;c+=1,u=d+s.length}return c};return Math.max(i(t,r),i(n,a))}function hm(e,t){const n=l(t).toLowerCase(),r=_t(t);if(!n)return[];const a=[],i=new Set;for(const o of e||[]){if(typeof o!="object"||Ot(o))continue;const s=l(o.mode||"",40).toLowerCase(),c=l(o.key||"",2e3);if(s==="folder"||c.startsWith("folder:"))continue;const u=Oc(o);if(!u.length)continue;let d=0;for(const f of u)d+=Pc(f,n,r);if(!(d<=0))for(const f of u){const p=z(f);!p||i.has(p)||(i.add(p),a.push(f))}}return a}function Lc(e,t=[]){const n=String(e||"");if(!/character\s*image\s*tags/i.test(n))return!1;const r=(n.match(/^#{2,3}\s+.+$/gm)||[]).filter(i=>!/character\s*image\s*tags/i.test(i)),a=Array.isArray(t)?t.filter(Boolean).length:0;return r.length>=3&&(a===0||r.length>a+1)}function _m(e){const t=[],n=new Set;for(const r of e||[])if(ke(r))for(const a of cr(r)){const i=l(a,200),o=z(i);!i||!o||n.has(o)||(n.add(o),t.push(i))}return t}function Bc(e){return e===!1||e==="false"||e==="off"||e==="none"?"off":e==="full"?"full":"tags"}function ym(e,t,n=[],r=5,a=1200,i=null,o="tags"){const s=Array.isArray(e)?e:[],c=Bc(o),u=c==="off"?[]:s.filter(g=>Ot(g)),d=s.filter(g=>!Ot(g)),f=bm(d,t,r,a),p=Array.isArray(i)&&i.length?i.map(g=>l(g,200)).filter(Boolean):hm(d,t),m=[];for(const g of u){const h=l(g.content||g.data||"",5e4);if(h)if(c==="full")m.push({comment:l(g.comment||g.name||"lb-xnai.lb.extra",200),content:h,key:"full",always:!0,lore_extra_mode:"full"});else{const _=Tc(h,t,p),y=_.length?Cc(h,n,_):"";y&&!Lc(y,_)&&m.push({comment:l(g.comment||g.name||"lb-xnai.lb.extra",200),content:y,key:_.join(", "),always:!0,lore_extra_mode:"tags"})}}for(const g of f)Lc(l(g.content||g.data||"",a),[])||m.push(g);return m}function bm(e,t,n=5,r=1200){const a=l(t).toLowerCase(),i=_t(t);if(!a)return[];const o=[];for(const s of e||[]){if(typeof s!="object"||Ot(s))continue;const c=l(s.mode||"",40).toLowerCase(),u=l(s.key||"",2e3);if(c==="folder"||u.startsWith("folder:"))continue;const d=l(s.content||s.data||"",r);if(!d)continue;const f=Oc(s);if(!f.length)continue;let p=0;for(const m of f)p+=Pc(m,a,i);p<=0||o.push({comment:l(s.comment||s.name||"",200),content:d,key:u,hits:p})}return o.sort((s,c)=>c.hits-s.hits||String(s.comment).localeCompare(String(c.comment))),o.slice(0,Math.max(1,n)).map(({hits:s,...c})=>c)}W(),yt(),F(),On(),Gt(),rt(),he(),Jn(),lt();function wm(e){for(let t=e.length-1;t>=0;t--){const n=e[t];if(!n||n.role!=="user")continue;const r=typeof n.content=="string"?n.content:"";if(r.trim()&&!r.startsWith("# Priority: Author"))return r}return""}async function vm(e){const t=et($().card,e.card||{}),n=l(e.session_id,200),r=[{role:"system",content:`${nr(await ue("tagger"))}

${nr(await ue("format"))}`.trim()}];t.char_info&&l(e.character_description)&&r.push({role:"system",content:`${await ue("char_inject")}
## {{char}} Info
${l(e.character_description,12e3)}`}),t.user_info&&l(e.persona_description)&&r.push({role:"system",content:`${await ue("char_inject")}
## {{user}} Info
${l(e.persona_description,8e3)}`});const a=l(e.assistant_text,2e4),i=Array.isArray(e.source_session_ids)?e.source_session_ids.map(g=>l(g,200)).filter(Boolean):[],o=t.lorebook||t.char_appearance!==!1?await wa(n,l(e.unified_session_id||"",200),l(e.character_id||"",200),i):[],s=_m(o);if(t.lorebook){const g=Array.isArray(e.lore_trigger_keys)?e.lore_trigger_keys:null,h=Bc(t.lore_extra),_=ym(e.lorebook||[],a,s,5,1200,g,h),y=[],v=[];for(const A of _){const O=Ot(A)||A.always,E=l(A.content||"",O?5e4:1200);if(!E)continue;const M=l(A.comment||"",200),j=M?`### ${M}
${E}`:E;O?y.push(j):v.push(j)}const x=[];y.length&&x.push(`## lb-xnai.lb.extra — OFFICIAL PACK (START)
Until END: lb-xnai pack only (custom prompt + Character Image Tags). \`### Name\` headings here are pack sections, not separate lore.

`+y.join(`

`)+`

## lb-xnai.lb.extra — OFFICIAL PACK (END)
[END OF lb-xnai.lb.extra] Pack finished — text below is not lb-xnai ground truth.`),v.length&&x.push(`## Reference Lorebook (trigger-matched only)
Naming/context only. Not lb-xnai. Do not copy lore prose into tags.

`+v.join(`

`)),w("job.lore.extra",{trigger_keys:Array.isArray(g)?g.length:0,injected:y.length,reference:v.length,sections:_.filter(A=>Ot(A)||A.always).map(A=>A.key||"").filter(Boolean).join(" | ")}),x.length&&r.push({role:"system",content:`${await ue("lore_inject")}
${x.join(`

`)}`})}if(t.char_appearance!==!1){const g=o,h=g.filter(v=>ke(v)),_=g.filter(v=>l(v.name,200)&&!ke(v)),y=Dl(a,g);if(h.length||_.length||y.length){const v=j=>{const S=l(j.name,200),I=l(j.appearance||"",200),P=l(j.attire||"",160),U=l(j.accessories||"",120),Z=[I?`appearance=${I}`:"",P?`attire=${P}`:"",U?`accessories=${U}`:""].filter(Boolean);return Z.length?`${S} ← ${Z.join(" | ")}`:S},x=y.filter(j=>ke(j)),A=y.filter(j=>!ke(j)),O=x.length?x.map(v).filter(Boolean).join(`
`):"(none)",E=A.length?A.map(j=>`- ${j.name} (aliases: ${cr(j).slice(0,8).join(", ")}) → empty appearance; full looks required in new_characters`).join(`
`):"(none)";let M=await ue("appearance_inject");M.includes("{registered_block}")&&(M=M.replace("{registered_block}",O)),M=M.includes("{incomplete_block}")?M.replace("{incomplete_block}",E):`${M}

## Incomplete
${E}`,M=M.includes("{detected_block}")?M.replace("{detected_block}",O):`${M}

${O}`,r.push({role:"system",content:M}),w("job.roster.split",{filled:h.map(j=>j.name),incomplete:_.map(j=>j.name),matched:y.map(j=>j.name),matched_with_looks:x.map(j=>j.name),session_id:n})}}const c=ka(t.natural_base),u=nt(t);r.push({role:"system",content:["Every shot MUST include `y_percent` (0–100): reading position top→bottom. Spread across the full range in order (shot0 < shot1 < …); ~even gaps. E.g. 2→~25/~75; 3→~20/~50/~80; 4→~15/~40/~65/~90. Forbidden: all under 40, duplicates, or gaps under ~15 unless 1 shot.",km(c),`CHARACTER CAP: at most ${u} characters per shot (char1..char${u}). If more are visible, keep the ${u} most important; fold extras into situation/place.`].join(`
`)});const d=await fc();d&&r.push({role:"system",content:d});const f=[];if(Number(t.include_max||0)>0)for(const g of e.recent_messages||[]){const h=l(g?.role,40)||"char",_=l(g?.content||g?.data,12e3);_&&(a&&_===a&&["char","assistant","bot"].includes(h.toLowerCase())||f.push(`[${h}]
${_}`))}a&&f.push(a);const p=f.length?f.join(`

`):a;if(!p)throw new Error("태깅할 메시지 텍스트가 없습니다.");r.push({role:"user",content:p});const m=l(await ue("author_note"),8e3);return m&&r.push({role:"user",content:`# Priority: Author's Note
${m}
> These are instructions explicitly given by the user. If in conflict with previous instructions, this section MUST take precedence.`}),r}function xm(e){const t=nt($().card),n=e,r=[];for(const a of n.scenes||[]){const i=l(a.place);for(const o of a.shots||[]){const s={...o,place:i,characters:ia(o.characters||[],[],t).slice(0,t)};r.push(s)}}return r}function km(e){return e==="off"?"Natural base mode OFF. Omit the `natural` field (or leave it empty). Do not invent natural-language base phrases.":e==="detailed"?["Natural base mode DETAILED. Every shot MUST include `natural`: a compact English phrase for NovelAI base caption only (NOT Danbooru comma tags, NOT characters[].action).","Include framing/vantage when useful (side view, close-up, viewed through, reflected in…), then for each visible person in left-to-right (or front-to-back) order: hair color + age band + gender, facial expression, clothing, and pose/action as separate details.","Multi-person: NEVER use character names — use position (left girl, right boy) or hair. Add shared action and lighting/atmosphere briefly.","Telegraphic and objective. Example: `side view upper body, left red hair adult woman tense smile in coat pulling right blue hair teen boy startled arms pinned, warm cafe light`. Keep ~12–28 words, English only."].join(" "):e==="supplement"?["Natural base mode SUPPLEMENT. Every shot MUST include `natural`: telegraphic English sentences describing what tags cannot express (composition, framing, actions, atmosphere, lighting) for NovelAI base caption only (NOT Danbooru comma tags, NOT characters[].action).","Keep tags and natural language clearly separated. Multi-person: NEVER use names — identify by position (left girl, bottom boy) or appearance. For each person include facial expression and clothing as distinct details; also hair and pose unless already obvious.","Unusual framing welcome (viewed through, reflected in shards of a broken mirror, behind…). Concise, minimal, objective — no subjective interpretation.","Example: `Side view, upper body. Left: adult woman with red hair, tense smile, coat, pulling. Right: teen boy with blue hair, startled face, arms pinned. Warm cafe lighting.` Prefer ~2–5 short sentences, English only."].join(" "):["Natural base mode SHORT. Every shot MUST include `natural`: a short English natural-language phrase for NovelAI base caption only (NOT Danbooru comma tags, NOT characters[].action).","Include hair color + age band + gender for each visible person, plus the shared action. Example: `red hair adult woman forced hug blue hair boy`. Keep ~6–20 words, English only."].join(" ")}X(),W(),F(),yt(),Nt(),Va(),rt(),Gt(),$e(),he(),Jn(),lt();var Rc=5e3,Sm=2500,Am=64;function Mm(e,t,n){const r=Or(t,n),a=(An.get(r)?.epoch||0)+1;return An.set(r,{epoch:a,jobId:e}),bt.set(e,{key:r,epoch:a,cancelRequested:!1,publishedIds:[]}),{key:r,epoch:a}}function Nm(e){const t=bt.get(e);if(!t||t.cancelRequested)return!1;const n=An.get(t.key);return!!(n&&n.jobId===e&&n.epoch===t.epoch)}async function Im(e){const t=bt.get(e),n=t?.publishedIds?[...t.publishedIds]:[];t&&(t.publishedIds=[]);for(const r of n)try{await ai(r)}catch{}return n.length}async function Ne(e,t="interrupted"){if(Nm(e))return!1;const n=await Im(e);return await fe(e,"cancelled",{phase:"cancelled",progress:0,message:`${t}${n?` · discarded ${n}`:""}`,shot_count:0,shot_done:0},null),w("job.cancelled",{job_id:e,message:t,discarded:n,focus:!0}),!0}function Hn(e={}){return{shot_count:e.shot_count??0,shot_index:e.shot_index??0,shot_done:e.shot_done??0,progress:e.progress??0,phase:e.phase||"generating",message:e.message||"",cards_so_far:e.cards_so_far,debug_stage:mt()||bn(),debug_error:Qn()?.message||""}}function Em(e){return!e||typeof e!="object"?e:JSON.parse(JSON.stringify(e,(t,n)=>{if(t==="image_url"&&typeof n=="string"&&n.startsWith("data:"))return"";if(!(t==="tagged"||t==="appearance"||t==="debug_tail"))return n}))}async function fe(e,t,n=null,r=null){const a=await D("jobs",e);if(!a)return;const i=a.state,o={...a,state:t},s=Em(n);o.result_json=s!=null?JSON.stringify(s):null,o.error=r,o.updated_at=Date.now()/1e3;const c=t!=="generating"||i!=="generating"||!!r;await R("jobs",o,{persist:c}),(t==="done"||t==="error"||t==="cancelled")&&await Yo(),w("job.set",{message:`${t}${r?" ERR":""}${c?"":" (mem)"}`,job_id:e,state:t,persist:c,err:r?String(r).slice(0,160):"",background:t==="generating",focus:t!=="generating"})}async function Dc(e){if(!($().card||{}).power&&!e.force)throw new Error("Power가 OFF 상태입니다.");const t=l(e.session_id,200)||`sess_${ht().replace(/-/g,"").slice(0,12)}`,n={...e,session_id:t},r=await ii(n,t);if(r)return w("job.busy",{message:r.error.message||"busy",key:Or(n,t),focus:!0},"warn"),r;const a=ht(),i=Date.now()/1e3;if(Mm(a,n,t),n.force)try{await ni(t,l(n.content_hash||""),n.message_index)}catch{}return await R("jobs",{id:a,session_id:t,state:"queued",request_json:JSON.stringify(n),result_json:null,error:null,created_at:i,updated_at:i}),Cm(a).catch(async o=>{console.error("[Inlay Nexus] job crashed",a,o);try{await fe(a,"error",null,String(o?.message||o).slice(0,1500))}catch{}}),{ok:!0,accepted:!0,job_id:a,session_id:t,job_state:"queued"}}async function jm(e){const t=await D("jobs",e);if(!t)return{ok:!1,error:{code:"not_found",message:"job not found"}};const n=t.result_json?JSON.parse(t.result_json):null,r={};if(n&&typeof n=="object")for(const a of["shot_count","shot_index","shot_done","progress","phase","message","cards_so_far","debug_stage","debug_error"])a in n&&(r[a]=n[a]);return n&&await it(n),{ok:!0,job_id:t.id,session_id:t.session_id,state:t.state,error:t.error,result:n,progress:r,debug:{last_stage:bn(),last_error:Qn(),events:Kr(e,40)},created_at:t.created_at,updated_at:t.updated_at}}function $m(e){for(const t of["y_percent","anchor_percent","read_percent"]){const n=e[t];if(n!=null)try{return Math.max(0,Math.min(100,Number(n)))}catch{return null}}return null}async function Cm(e){const t=await D("jobs",e);if(!t)return;const n=JSON.parse(t.request_json??"{}"),r=String(t.session_id??""),a=ji();yn(e);const i=se("job.run");w("job.start",{job_id:e,session_id:r,message_index:n.message_index,text_len:String(n.assistant_text||"").length});try{if(await Ne(e,"superseded before start")||(n.force&&await ni(r,l(n.content_hash||""),n.message_index),await Ne(e,"superseded before tagging")))return;await fe(e,"tagging",{phase:"tagging",progress:0,message:"장면 태깅 중…",shot_count:0,shot_done:0,debug_stage:"job.tagging"});const o=await vm(n),s=wm(o);if(w("job.tagger.messages",{msgs:o.length}),$().card?.preprocessing){const S=nr(await ue("preprocess"));if(S){const I=[{role:"system",content:S},o[o.length-1]],P=await nn($().llm,I);if(await Ne(e,"superseded during preprocess"))return;o.splice(o.length-1,0,{role:"system",content:`## Preprocess Summary
${P}`})}}const c=await nn($().llm,o);if(await Ne(e,"superseded after tagging"))return;const u=qr(c);let d=xm(u);if(w("job.tagger.done",{shots:d.length,raw_len:String(c||"").length}),!d.length)throw new Error("태거가 shot을 반환하지 않았습니다.");const f=$().card||{},p=Math.max(1,Number(f.image_min??1)),m=Math.max(p,Number(f.image_max??3));d=d.slice(0,m);const g=Er();if(g==="two_stage"){if(await fe(e,"tagging",{phase:"tagging",progress:.35,message:"큐레이션 2단 씬 태그 보강 중…",shot_count:d.length,shot_done:0,debug_stage:"job.curation_refine"}),await Ne(e,"superseded during curation refine"))return;await mc(d,{chatContext:s})}else if(g==="embed_snap"){if(await fe(e,"tagging",{phase:"tagging",progress:.4,message:"씬 태그 임베딩 매칭 중…",shot_count:d.length,shot_done:0,debug_stage:"job.curation_snap"}),await Ne(e,"superseded during curation snap"))return;const S=await hc(d);S.ok||(w("job.curation_snap.fallback",{message:S.reason},"warn"),await fe(e,"tagging",{phase:"tagging",progress:.45,message:S.reason||"임베딩 없음 → 큐레이션 없이 생성",shot_count:d.length,shot_done:0,debug_stage:"job.curation_snap_fallback"}))}const h=d.flatMap(S=>S.characters||[]),_=l(n.unified_session_id||"",200),y=l(n.character_id||"",200),v=Array.isArray(n.source_session_ids)?n.source_session_ids.map(S=>l(S,200)).filter(Boolean):[],x=await Lu({sessionId:r,tagged:u,shotChars:h,unifiedSessionId:_,characterId:y,sourceSessionIds:v});w("job.roster",{roster:x.length});const A=nt(f);for(const S of d)S.characters=ia(S.characters||[],x,A);if(await Ne(e,"superseded before generate"))return;await fe(e,"generating",Hn({shot_count:d.length,shot_index:0,shot_done:0,progress:0,phase:"generating",message:`이미지 1/${d.length} 생성 준비`}));const O=[],E=!!f.llm_anchor_percent;for(let S=0;S<d.length;S+=1){if(await Ne(e,`superseded before shot ${S+1}`))return;const I=d[S],{main:P,neg:U,captions:Z,meta:Le}=await Tr({shot:I,roster:x}),G=ht(),Y=Date.now()/1e3,K=l(n.content_hash||"");let qe=$m(I);qe==null&&E&&(qe=Math.round(S/Math.max(1,d.length)*1e4)/100),w("job.shot.prepare",{shot:S,card_id:G,prompt_len:String(P||"").length,captions:(Z||[]).length}),await fe(e,"generating",Hn({shot_count:d.length,shot_index:S,shot_done:S,progress:Math.round(S/Math.max(1,d.length)*1e3)/10,phase:"generating",message:`NovelAI 요청 중 ${S+1}/${d.length}… [${mt()}]`}));let re=0;const ft=setInterval(()=>{re+=Rc/1e3;const al=gs();hs()&&Ia()>=Am&&al&&Date.now()-al>=Sm&&qu("heartbeat-idle");const il=Ia()||ps();fe(e,"generating",Hn({shot_count:d.length,shot_index:S,shot_done:S,progress:Math.round(S/Math.max(1,d.length)*1e3)/10,phase:"generating",message:`NovelAI 대기 ${S+1}/${d.length} (${re}s) · ${mt()}${il?` ${Math.round(il/1024)}KB`:""}`})).catch(()=>{})},Rc);let q,Be;try{({bytes:q,seed:Be}=await Ac({main:P,neg:U,captions:Z}))}finally{clearInterval(ft)}if(w("job.shot.nai_done",{shot:S,bytes:q?.byteLength||0,seed:Be}),await Ne(e,`superseded after shot ${S+1} nai`))return;await fe(e,"generating",Hn({shot_count:d.length,shot_index:S,shot_done:S,progress:Math.round((S+.5)/Math.max(1,d.length)*1e3)/10,phase:"generating",message:`이미지 저장 중 ${S+1}/${d.length}… [${mt()}]`}));const ae=Wf({imageId:G,sessionId:r,request:n,shotIndex:S,paragraph:I.paragraph,yPercent:qe,contentHash:K});await pa(G,q,ae);const ag=Xa(Le,ae,q?.byteLength||0);await R("cards",{id:G,job_id:e,session_id:r,shot_index:S,paragraph:Number(I.paragraph||0),main_prompt:P,negative_prompt:U,characters_json:JSON.stringify(Le.characters||[]),seed:Be,meta_json:JSON.stringify(ag),created_at:Y});const rl=bt.get(e);if(rl&&rl.publishedIds.push(G),await Ne(e,`superseded after shot ${S+1} save`))return;O.push({id:G,shot_index:S,paragraph:ae.paragraph,y_percent:ae.y_percent,message_index:ae.message_index??-1,message_role:ae.message_role||"",content_hash:ae.content_hash||"",character_id:ae.character_id||"",chat_id:ae.chat_id||"",character_name:ae.character_name||"",chat_name:ae.chat_name||"",char_index:ae.char_index??-1,chat_index:ae.chat_index??-1,assistant_preview:l(n.assistant_text||"",Ni),main_prompt:P,negative_prompt:U,characters:Le.characters||[],image_url:Ce(G),seed:Be,storage:"indexeddb",png_bytes:q?.byteLength||0}),w("job.shot.saved",{shot:S,card_id:G,has_url:!!Ce(G)}),await fe(e,"generating",Hn({shot_count:d.length,shot_index:S,shot_done:S+1,progress:Math.round((S+1)/Math.max(1,d.length)*1e3)/10,phase:"generating",message:`이미지 ${S+1}/${d.length} 완료`,cards_so_far:O.length}))}if(await Ne(e,"superseded before done"))return;const M={cards:O,message_index:n.message_index!=null?Number(n.message_index):-1,shot_count:d.length,shot_done:d.length,progress:100,phase:"done",message:`이미지 ${d.length}/${d.length} 완료`};await it(M),await fe(e,"done",M);const j=bt.get(e);j&&(j.publishedIds=[]),i.end({message:"done",cards:O.length})}catch(o){i.fail(o);const s=o,c=`${s?.message||o}
${s?.stack||""}`.slice(-1500);await fe(e,"error",{phase:"error",message:String(s?.message||o).slice(0,240),debug_stage:bn(),debug_tail:Kr(e,12)},c)}finally{yn(a)}}F(),rt(),Ut(),$e(),he();function Pt(e,t){try{return JSON.parse(e)}catch{return t}}async function Tm(e,t={}){const n=l(e,80),r=await D("cards",n);if(!r)return{ok:!1,error:{code:"not_found",message:"card not found"}};const a=Pt(r.characters_json||"[]",[]),i=Array.isArray(a)?a:[];let o=r.main_prompt;"main_prompt"in t&&(o=l(t.main_prompt,8e3));let s=r.negative_prompt;"negative_prompt"in t&&(s=l(t.negative_prompt,8e3));let c=i;if("characters"in t){const f=t.characters||[];if(!Array.isArray(f))return{ok:!1,error:{code:"bad_request",message:"characters must be a list"}};c=[];const p=nt($().card||{});for(let m=0;m<f.slice(0,p).length;m++){const g=f[m];if(typeof g!="object")continue;const h=g,_=m<i.length&&typeof i[m]=="object"?i[m]:{},y=l(h.name!=null?h.name:_.name,200),v=l(h.prompt!=null?h.prompt:_.prompt,4e3);if(!y&&!v)continue;const x={..._,name:y||`char${m+1}`,prompt:v||"girl"};"uc"in h&&(x.uc=l(h.uc,2e3));for(const A of["center_x","center_y"])if(A in h)try{x[A]=Number(h[A])}catch{}c.push(x)}}r.main_prompt=o,r.negative_prompt=s,r.characters_json=JSON.stringify(c);try{let f=Pt(r.meta_json||"{}",{});(!f||typeof f!="object"||Array.isArray(f))&&(f={});const p=f;p.setup=o,p.characters=c,r.meta_json=JSON.stringify(p)}catch{}await R("cards",r);const u=await dt(n,{}),d={id:n,main_prompt:o,negative_prompt:s,characters:c,paragraph:r.paragraph,shot_index:r.shot_index,y_percent:u.y_percent,message_index:u.message_index,content_hash:u.content_hash,image_url:Ce(n)};return await it(d),{ok:!0,card:d}}async function Fc(e,t="nai",n=null,r={}){const a=await D("cards",e);if(!a)return{ok:!1,error:{code:"not_found",message:"card not found"}};const i=a.session_id,o=Pt(a.meta_json||"{}",{}),s=o.location||{};if(!r.skipBusyCheck)try{const I=await dt(e,o),P=await ii({session_id:i,content_hash:l(I.content_hash||o.content_hash||"",128),message_index:L(I.message_index,-1)},i);if(P)return P}catch{}const c=l(s.character_id||o.character_id||"",200);let u=l(o.unified_session_id||s.unified_session_id||"",200);!u&&c&&(u=ml(c));let d=[];try{const I=await D("jobs",a.job_id);if(I?.request_json){const P=JSON.parse(I.request_json);Array.isArray(P.source_session_ids)&&(d=P.source_session_ids.map(U=>l(U,200)).filter(Boolean))}}catch{}const f=await wa(i,u,c,d);if(t==="full"){const I=await D("jobs",a.job_id);if(!I)return{ok:!1,error:{code:"no_job",message:"original job missing"}};const P=JSON.parse(I.request_json);return P.force=!0,Dc(P)}let p,m,g,h,_={};const y=n;if(y&&("main_prompt"in y||"negative_prompt"in y||"characters"in y))p="main_prompt"in y?l(y.main_prompt||""):l(a.main_prompt),m="negative_prompt"in y?l(y.negative_prompt||""):l(a.negative_prompt),h="characters"in y?y.characters:null,h==null&&(h=Pt(a.characters_json||"[]",[])),g=(h||[]).slice(0,nt($().card||{})).map(I=>({prompt:la(I.prompt||"girl")||"girl",uc:l(I.uc),center_x:Number(I.center_x??.5),center_y:Number(I.center_y??.5)}));else if(l(a.main_prompt||"")){const I=Pt(a.characters_json||"[]",[]),P=Array.isArray(I)?I:[],U=zc(o),Z=P.map(ft=>{if(!ft||typeof ft!="object")return null;const q=ft;if(q.raw&&typeof q.raw=="object"){const Be=q.raw;return{...Be,name:l(Be.name||q.name,200)}}return{name:l(q.name,200),action:q.action,expression:q.expression,sex:q.sex,label:q.label,age:q.age,original:q.original||q.original_tag}}).filter(Boolean),Le=$().card||{},G=Ue($().nai?.model||"nai-diffusion-4-5-full"),Y=Object.values(kn).filter(Boolean);kn[G]&&Y.unshift(kn[G]);const K=eu({setup:o.setup,main:a.main_prompt,person:o.person,stylePositives:tu(Le),qualitySuffixes:Y}),qe={characters:U.length?U:Z,paragraph:a.paragraph,camera:K.rebuildMain&&K.lockedSetup?"":l(o.camera||""),situation:K.rebuildMain&&K.lockedSetup?"":l(o.situation||o.scene||""),place:K.rebuildMain&&K.lockedSetup?"":l(o.place||""),action:K.rebuildMain&&K.lockedSetup?"":l(o.action||"")},re=await Tr({shot:qe,roster:f,lockedSetup:K.rebuildMain?K.lockedSetup:void 0});K.rebuildMain?(p=re.main,m=re.neg,g=re.captions,h=re.meta.characters,_={setup:re.meta.setup,person:re.meta.person,characters:h}):(p=l(a.main_prompt),m=l(a.negative_prompt)||re.neg,g=re.captions,h=re.meta.characters,_={setup:p,person:re.meta.person,characters:h})}else{const I=Pt(a.characters_json||"[]",[]),P=zc(o),U=(I||[]).map(Y=>{if(!Y||typeof Y!="object")return null;const K=Y;return K.raw||{name:K.name,action:K.action,expression:K.expression}}).filter(Boolean),Z=l(o.setup||""),Le={characters:P.length?P:U,paragraph:a.paragraph,camera:Z?"":l(o.camera||""),situation:Z?"":l(o.situation||o.scene||""),place:Z?"":l(o.place||""),action:Z?"":l(o.action||"")},G=await Tr({shot:Le,roster:f,lockedSetup:Z});p=G.main,m=G.neg,g=G.captions,h=G.meta.characters,_={setup:G.meta.setup,person:G.meta.person,characters:h}}if(!g.length&&!(y&&"characters"in y)){const I={characters:(o.characters||[]).map(U=>U.raw||U),camera:o.setup},P=await Tr({shot:I,roster:f});p=P.main,m=P.neg,g=P.captions,h=P.meta.characters,_={setup:P.meta.setup,person:P.meta.person,characters:h}}const{bytes:v,seed:x}=await Ac({main:p,neg:m,captions:g}),A=ht(),O=Date.now()/1e3;let E=await Tt(a.id);Object.keys(E).length||(E=await dt(a.id,o));const M={version:1,image_id:A,session_id:i,unified_session_id:u,character_id:l(E.character_id||"",200),character_name:l(E.character_name||o.character_name||"",200),chat_id:l(E.chat_id||"",200),chat_name:l(E.chat_name||o.chat_name||"",200),char_index:L(E.char_index,-1),chat_index:L(E.chat_index,-1),message_index:L(E.message_index,-1),shot_index:L(E.shot_index,L(a.shot_index,0)),paragraph:L(E.paragraph,L(a.paragraph,0)),y_percent:tr(E.y_percent),content_hash:l(E.content_hash||"",128),assistant_preview:l(E.assistant_preview||o.assistant_preview||"",Xe)};await pa(A,v,M);const j=Xa({...o,..._},M,v.byteLength);for(const I of["y_percent","anchor_percent","read_percent"])delete j[I];j.y_percent=M.y_percent,await R("cards",{id:A,job_id:a.job_id,session_id:i,shot_index:a.shot_index,paragraph:a.paragraph,main_prompt:p,negative_prompt:m,characters_json:JSON.stringify(h),seed:x,meta_json:JSON.stringify(j),created_at:O});try{await ai(e)}catch{}const S={id:A,image_url:Ce(A),main_prompt:p,negative_prompt:m,characters:h,seed:x,paragraph:M.paragraph,y_percent:M.y_percent,message_index:M.message_index,shot_index:M.shot_index,content_hash:M.content_hash,character_id:M.character_id,chat_id:M.chat_id,character_name:M.character_name,chat_name:M.chat_name,assistant_preview:M.assistant_preview,storage:"indexeddb",png_bytes:v.byteLength};return await it(S),{ok:!0,replaced:e,card:S}}async function Om({session_id:e="",content_hash:t="",message_index:n=-1}={}){const r=l(e,200),a=l(t,128),i=L(n,-1);if(!r&&!a&&i<0)return{ok:!1,error:{code:"bad_request",message:"session_id or content_hash required"}};const o=await ye("cards"),s=[];for(const h of o){if(r&&h.session_id!==r)continue;const _=Pt(h.meta_json||"{}",{}),y=await dt(h.id,_),v=l(y.content_hash||_.content_hash||"",128),x=L(y.message_index,-1);if(a){if(v!==a)continue}else if(i>=0){if(x!==i)continue}else continue;const A=y.y_percent??_.y_percent??_.anchor_percent??_.read_percent,O=Number(A);s.push({row:h,y:Number.isFinite(O)?O:999,shot:L(h.shot_index,0),paragraph:L(h.paragraph??y.paragraph,0)})}if(s.sort((h,_)=>h.y-_.y||h.shot-_.shot||h.paragraph-_.paragraph),!s.length)return{ok:!1,error:{code:"not_found",message:"no cards for message"}};const c=r||l(s[0]?.row?.session_id||"",200),u={session_id:c,content_hash:a,message_index:i},d=await ii(u,c);if(d)return d;const f=Or(u,c);ir.add(f);const p=[],m=[],g=[];try{for(const h of s){const _=h.row;try{const y=await Fc(_.id,"nai",null,{skipBusyCheck:!0});if(y?.busy){g.push({id:_.id,error:y.error?.message||"busy"});break}y?.ok&&y.card?(p.push(y.card),y.replaced&&m.push(y.replaced)):g.push({id:_.id,error:l(y?.error?.message||"reroll failed",400)})}catch(y){g.push({id:_.id,error:l(y?.message||y,400)})}}return{ok:p.length>0,count:p.length,replaced:m,cards:p,failed:g}}finally{ir.delete(f)}}function zc(e){return Array.isArray(e.characters)?e.characters.map(t=>t&&typeof t=="object"?t.raw||t:null).filter(Boolean):[]}var Pm=sn({HASH_REBIND_THRESHOLD:()=>Fm,PREFIX_MATCH_MIN_CHARS:()=>24,PREFIX_MATCH_THRESHOLD:()=>Dm,SIMILARITY_COMPARE_MAX:()=>800,VIEWER_THUMB_LAYOUT:()=>ee,activeSegmentIndex:()=>Cp,bigramCounts:()=>ci,claimStickyMarkerByCardId:()=>cp,clampPinPercent:()=>Ge,clampReadingPercent:()=>$p,clampThumbScrollOffset:()=>xp,composeDualProgressBarsHtml:()=>Ep,composeStickyThumbHtml:()=>pp,createDebouncedSaveQueue:()=>op,createScrollSettleTracker:()=>ap,createSessionChangeGuard:()=>ip,describeDomApiCompare:()=>Wm,diceBigramRatio:()=>Kc,evenAnchorPercent:()=>di,findHashRebindCandidates:()=>zm,fitBoxInside:()=>mp,galleryFocusMessage:()=>Km,galleryForMessage:()=>Jm,galleryIndexFromChildIndex:()=>bp,gallerySelectedCount:()=>ui,galleryStripContentWidth:()=>vp,galleryStripSplitAt:()=>Br,hasGenerationInfo:()=>Vc,isCharMessageRole:()=>Hm,isMessageSelectionGesture:()=>tp,isNearbyDomIndex:()=>Ap,linkCardsForMessage:()=>li,longestCommonPrefixLength:()=>Jc,mergeViewerPaintJob:()=>Np,messageCompactKey:()=>on,messageContextTriplet:()=>qm,messagesTextOverlapScore:()=>Yc,nearbyDomIndexWindow:()=>Mp,nearbyMessageImageIds:()=>Sp,normalizeMatchText:()=>Pr,normalizeMessageRole:()=>si,parseAutotagLookJson:()=>el,pickMessageIndexNearPoint:()=>ep,pinPercentToPx:()=>Zm,pinPercentToPxFromBottom:()=>Xm,pinPxToPercent:()=>Zc,prefixMatchRatio:()=>Gc,rawMessageRole:()=>Lr,readingPercentInMessage:()=>tl,rebindGalleryMessageIndexes:()=>Vm,resolveCardAnchorPercent:()=>jp,resolveChatMessageMatch:()=>Ym,resolveClickSelectionAction:()=>np,resolveIndexProgress:()=>Ip,resolveStickyThumbPct:()=>dp,resolveStoredPinPercent:()=>Qm,roleFromGenerationInfo:()=>Gm,scaleInlineThumbnail:()=>Rm,shouldKeepStickyThumbHidden:()=>up,shouldRefreshGallery:()=>sp,shouldRewriteStickyThumb:()=>lp,shouldSelectMessageByTextDrag:()=>rp,stickyCornerEdgeBox:()=>Xc,stickyCornerImageBox:()=>hp,stickyPinEdgeBox:()=>yp,stickyPinOverImage:()=>_p,stickyThumbBoxFromPct:()=>fp,stickyThumbNeedsHtmlPaint:()=>gp,thumbIndexAtStripX:()=>wp,visibleGalleryImageIds:()=>kp}),Lm=528,Bm=720;function b(e,t=0){const n=Number(e);return Number.isFinite(n)?n:t}function Uc(e,t){const n={...e};for(const[r,a]of Object.entries(t||{})){const i=n[r];n[r]=a&&typeof a=="object"&&!Array.isArray(a)?Uc(i&&typeof i=="object"?i:{},a):a}return n}function Rm(e){const t=Math.max(1,b(e,100));return{width:Math.max(1,Math.round(Lm*t/100)),height:Math.max(1,Math.round(Bm*t/100)),percent:t}}function Pr(e){return String(e||"").replace(/[^a-zA-Z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/g,"").toLowerCase()}var Dm=.6,Fm=.6,ig=24,og=800;function si(e){const t=String(e||"").toLowerCase().trim();return t?t==="char"||t==="assistant"||t==="bot"?"char":t==="user"||t==="human"?"user":t:""}function Jc(e,t){const n=String(e||""),r=String(t||""),a=Math.min(n.length,r.length);let i=0;for(;i<a&&n.charCodeAt(i)===r.charCodeAt(i);)i+=1;return i}function ci(e){const t=String(e||""),n=new Map;if(t.length<2)return n;for(let r=0;r<t.length-1;r+=1){const a=t.charCodeAt(r)+","+t.charCodeAt(r+1);n.set(a,(n.get(a)||0)+1)}return n}function Kc(e,t,n=null){const r=String(e||""),a=String(t||"");if(!r||!a)return 0;if(r===a)return 1;if(r.length<2||a.length<2)return 0;const i=n||ci(r),o=ci(a);let s=0;for(const[d,f]of o){const p=i.get(d)||0;p&&(s+=Math.min(p,f))}const c=r.length-1,u=a.length-1;return 2*s/(c+u)}function Gc(e,t){const n=Pr(e),r=Pr(t);if(!n||!r)return 0;const a=Math.max(n.length,r.length);if(a<24)return 0;if(n===r)return 1;const i=Jc(n,r)/a;return i>=.6?i:Kc(n.length>800?n.slice(0,800):n,r.length>800?r.slice(0,800):r)}function li(e,t){if(!t)return[];const n=Array.isArray(e)?e:[],r=String(t.hash||"");return r?Wc(n.filter(a=>a?.content_hash&&a.content_hash===r)):[]}function zm(e,t={}){const n=Array.isArray(e)?e:[],r=String(t.newHash||t.hash||""),a=String(t.text||""),i=String(t.characterId||""),o=String(t.chatId||""),s=String(t.sessionId||""),c=Number(t.messageIndex),u=si(t.role||t.messageRole||"");if(!r||!a||!i||!u||!Number.isFinite(c)||c<0)return[];if(n.some(f=>f?.content_hash&&f.content_hash===r))return[];if(Pr(a).length<24)return[];const d=[];for(const f of n){const p=String(f?.content_hash||"");if(!p||p===r||String(f?.character_id||"")!==i)continue;const m=String(f?.chat_id||""),g=String(f?.session_id||"");if(o){if(m!==o)continue}else if(s){if(g&&g!==s)continue}else continue;if(Number(f?.message_index)!==c)continue;const h=si(f?.message_role||f?.role||"");if(!h||h!==u)continue;const _=String(f?.assistant_preview||"");if(!_)continue;const y=Gc(a,_);y<.6||d.push({card:f,score:y})}return d.sort((f,p)=>p.score-f.score||b(p.card?.created_at)-b(f.card?.created_at)),Wc(d.map(f=>f.card))}function Hc(e){const t=e?.y_percent??e?.anchor_percent??e?.read_percent,n=Number(t);return Number.isFinite(n)?n:Number.POSITIVE_INFINITY}function Um(e,t){return Hc(e)-Hc(t)||b(e?.paragraph)-b(t?.paragraph)||b(e?.shot_index)-b(t?.shot_index)||b(t?.created_at)-b(e?.created_at)}function qc(e,t){return b(t?.created_at)-b(e?.created_at)||b(t?.message_index)-b(e?.message_index)||b(t?.paragraph)-b(e?.paragraph)||b(t?.shot_index)-b(e?.shot_index)}function Wc(e){const t=new Map;for(const n of e||[]){const r=`${n?.paragraph??"?"}|${n?.shot_index??n?.id}`,a=t.get(r);(!a||b(n?.created_at)>=b(a?.created_at))&&t.set(r,n)}return[...t.values()]}function Jm(e,t,n=8){const r=new Map;for(const d of e||[]){const f=String(d?.id||"");!f||r.has(f)||r.set(f,d)}const a=[...r.values()],i=Math.max(0,Math.min(64,b(n,8)||8));if(!t)return a.sort(qc).slice(0,Math.max(1,i||8));const o=li(a,t).sort(Um),s=new Set(o.map(d=>String(d.id))),c=String(t.sessionId||""),u=a.filter(d=>!s.has(String(d.id))).filter(d=>!c||!d?.session_id||d.session_id===c).sort(qc).slice(0,i);return[...o,...u]}function ui(e,t){return t?li(e,t).length:0}function Km(e,t,n){return e&&ui(n,e)>0?e:t&&ui(n,t)>0?t:e||t||null}function Lr(e){const t=String(e?.role||e?.type||e?.speaker||e?.sender||e?.from||e?.name||"").trim().toLowerCase();return e?.isUser===!0||e?.fromUser===!0||/^(user|human|player|you|me)$/.test(t)||t.includes("user")?"user":e?.isAssistant===!0||e?.isBot===!0||e?.isChar===!0||/^(assistant|bot|char|character|model|ai)$/.test(t)||t.includes("assistant")||t.includes("bot")||t.includes("char")?"char":t==="system"||t==="developer"?"system":""}function Vc(e){const t=e?.generationInfo??e?.generation_info??e?.messageGenerationInfo;return t==null?!1:typeof t=="string"?t.trim().length>0:typeof t=="object"?Object.keys(t).length>0:!0}function Gm(e){return Vc(e)?"char":"user"}function Hm(e){if(e&&typeof e=="object")return Lr(e)==="char";const t=String(e||"").trim().toLowerCase();return t==="char"||t==="assistant"||t==="bot"}function on(e,t=48){const n=Math.max(1,b(t,48));return String(e||"").replace(/\s+/g,"").slice(0,n)}function qm(e,t,n=48){const r=Array.isArray(e)?e:[],a=Math.floor(b(t,-1)),i=a>=0&&a<r.length?r[a]:null,o=a>0?r[a-1]:null,s=a>=0&&a<r.length-1?r[a+1]:null;return[on(o?.text,n),on(i?.text,n),on(s?.text,n),Lr(i)||String(i?.role||"").trim().toLowerCase()].join("|")}function Yc(e,t){const n=String(e||"").replace(/\s+/g,""),r=String(t||"").replace(/\s+/g,"");if(!n||!r)return 0;if(n.includes(r))return r.length;if(r.includes(n))return n.length;let a=0;const i=(s,c,u=8,d=512)=>{let f=u,p=Math.min(s.length,d),m=0;for(;f<=p;){const g=f+p>>1;c.includes(s.slice(0,g))?(m=g,f=g+1):p=g-1}return m};a=Math.max(a,i(r,n),i(n,r));const o=Math.min(r.length,2400);for(let s=0;s+8<=o;s+=32){const c=Math.min(64,o-s);for(let u=c;u>=8;u-=8)if(n.includes(r.slice(s,s+u))){a=Math.max(a,u);break}}return a}function Wm(e,t){const n=String(e||""),r=String(t||""),a=on(n),i=on(r),o=Yc(n,r),s=o>=8,c=a.length>0&&a.length<8&&a===i,u=i.slice(0,48),d=a.slice(0,48);return{domChars:n.length,apiChars:r.length,domCompactChars:a.length,apiCompactChars:i.length,shareScore:o,overlap:s,shortExact:c,apiInDom:!!(u&&u.length>=8&&a.includes(u)),domInApi:!!(d&&d.length>=8&&i.includes(d)),apiKey:u,domKey:d}}function Vm(e,t,n){const r=Array.isArray(t)?t:[],a=typeof n=="function"?n:null,i=new Map;if(a)for(let s=0;s<r.length;s+=1){const c=String(r[s]?.text??r[s]?.data??r[s]?.content??""),u=String(a(c)||"");if(!u)continue;const d=Number.isFinite(Number(r[s]?.index))?Number(r[s].index):s,f=i.get(u);f?f.push(d):i.set(u,[d])}let o=0;return{cards:(Array.isArray(e)?e:[]).map(s=>{const c=String(s?.content_hash||""),u=c?i.get(c):void 0;return!c||!u?s:u.length!==1?Number(s?.message_index)!==-1?(o+=1,{...s,message_index:-1}):s:Number(s?.message_index)!==u[0]?(o+=1,{...s,message_index:u[0]}):s}),changed:o}}function Ym(e,t,n,r,a){const i=Array.isArray(t)?t:[],o=Math.floor(b(n,-1)),s=(d,f,p,m=-1)=>({chatIndex:Number.isFinite(Number(d?.index))?Number(d?.index):m>=0?m:o,text:String(d?.text||e||""),role:Lr(d)||String(d?.role||"").trim().toLowerCase(),matchMethod:f,score:p});if(!i.length)return{chatIndex:Math.max(0,o),text:String(e||""),role:"",matchMethod:"fallback",score:0};const c=i.length-1-o;if(c>=0&&c<i.length)return s(i[c],"reverse",100,c);const u=Math.max(0,Math.min(i.length-1,c));return s(i[u],"reverse",50,u)}function Ge(e,t=0){const n=Number(e);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.floor(n))):Math.max(0,Math.min(100,Math.floor(b(t,0))))}function Zm(e,t,n=22,r=4){const a=Math.max(1,b(t,1)),i=Math.max(1,b(n,1)),o=Math.max(0,b(r,0)),s=Math.floor(a*Ge(e,0)/100);return Math.max(o,Math.min(a-i-o,s))}function Xm(e,t,n=22,r=8){const a=Math.max(1,b(t,1)),i=Math.max(1,b(n,1)),o=Math.max(0,b(r,0)),s=a-Math.floor(a*Ge(e,0)/100)-i;return Math.max(o,Math.min(a-i-o,s))}function Zc(e,t){const n=Math.max(1,b(t,1));return Ge(b(e,0)/n*100,0)}function Qm(e,t,n,r=null){const a=r&&typeof r=="object"?r:{x:38,y:80},i=t==="y"||t==="Y",o=i?b(a.y,80):b(a.x,38),s=i?"overlay_y_pct":"overlay_x_pct",c=i?"overlay_y_offset":"overlay_x_offset",u=String(e?.overlay_pin_origin||""),d=u==="top"||u==="tl"||u==="top-left",f=e?.[s],p=f!=null&&Number.isFinite(Number(f)),m=Number(e?.[c]),g=Number.isFinite(m),h=_=>Ge(100-Number(_),o);return p?i&&d?h(f):Ge(f,o):g?i?Ge((b(n,1)-m)/Math.max(1,b(n,1))*100,o):Zc(m,n):Ge(o,o)}function ep(e,t,n=null,r=800){const a=Array.isArray(e)?e:[];if(!a.length)return-1;const i=Math.max(1,b(r,800)),o=Number.isFinite(Number(t))?Number(t):i*.5,s=Number.isFinite(Number(n))?Number(n):null;let c=-1,u=1/0,d=-1,f=1/0;for(let p=0;p<a.length;p+=1){const m=a[p];if(!m)continue;const g=b(m.top,0),h=b(m.bottom,g);if(h<=0||g>=i)continue;const _=(g+h)*.5,y=Number.isFinite(Number(m.left))&&Number.isFinite(Number(m.right))?(Number(m.left)+Number(m.right))*.5:null,v=y!=null&&s!=null?Math.hypot(y-s,_-o):Math.abs(_-o);v<f&&(f=v,d=p);const x=o>=g&&o<=h,A=s==null||!Number.isFinite(Number(m.left))||!Number.isFinite(Number(m.right))||s>=Number(m.left)&&s<=Number(m.right);if(x&&A){const O=Math.max(1,h-g);O<u&&(u=O,c=p)}}return c>=0?c:d}function tp({gesture:e="single",detail:t=1,movement:n=0,textSelecting:r=!1,excludedTarget:a=!1}={}){const i=e==="double"?2:1;return!a&&!r&&b(n,1/0)<=8&&b(t)===i}function np({gesture:e="single",detail:t=1,pendingDomIndex:n=null,targetDomIndex:r=null}={}){const a=b(t,1);return e==="double"?a===1?{action:"provisional",pendingDomIndex:r}:a===2?{action:"confirm",clearPending:!0,matchedPending:n!=null&&Number(n)===Number(r)}:{action:"ignore"}:a===1?{action:"confirm",clearPending:!0}:{action:"ignore"}}function rp({enabled:e=!0,movement:t=0,hasSelection:n=!1,excludedTarget:r=!1}={}){return!!e&&!r&&!!n&&b(t,0)>8}function ap({delayMs:e=160,onSettle:t}={}){let n=null;const r=Math.max(0,b(e,160)),a=()=>{n=null,typeof t=="function"&&t()};return{bump(){n&&clearTimeout(n),n=setTimeout(a,r)},settleNow(){n&&clearTimeout(n),n=null,a()},cancel(){n&&clearTimeout(n),n=null},get pending(){return n!=null}}}function ip(e=""){let t=String(e||""),n="",r=0;return{observe(a){const i=String(a||"");return!i||i===t?(n="",r=0,!1):i!==n?(n=i,r=1,!1):(r+=1,r<2?!1:(t=n,n="",r=0,!0))},current(){return t},reset(a=""){t=String(a||""),n="",r=0}}}function op(e,t=300){let n={},r=null,a=null;const i=async()=>a||(a=(async()=>{for(;Object.keys(n).length;){const o=n;n={},await e(o)}})().finally(()=>{a=null}),a);return{enqueue(o){n=Uc(n,o),r&&clearTimeout(r),r=setTimeout(()=>{r=null,i().catch(()=>{})},Math.max(0,b(t,300)))},async flush(){r&&(clearTimeout(r),r=null);do await i();while(Object.keys(n).length||a)},hasPending(){return!!r||!!a||Object.keys(n).length>0}}}function sp(e,t){const n=Array.isArray(e)?e.map(String):[],r=Array.isArray(t)?t.map(String):[];if(n.length!==r.length)return!0;for(let a=0;a<n.length;a+=1)if(n[a]!==r[a])return!0;return!1}function cp(e,t){const n=String(t||"");if(!n||!Array.isArray(e)||!e.length)return null;const r=e.findIndex(i=>String(i?.card?.id||"")===n);if(r<0)return null;const a=e[r];return a?.thumb?(e.splice(r,1),a):null}function lp(e,t){return String(e||"")!==String(t||"")}function up(e,t,n){if(!e)return!1;const r=String(t||""),a=String(n||"");return!!r&&!!a&&r===a}function dp(e){if(!e.alwaysOn||e.userCollapsed||e.editorOpen)return 0;const t=b(e.settingsPct,0);return t>0?t:0}function fp(e,t,n){const r=Math.max(0,b(e,0)),a=Math.max(0,b(t,0)),i=Math.max(0,b(n,0));return{pct:r,w:Math.max(0,Math.round(a*r/100)),h:Math.max(0,Math.round(i*r/100))}}function mp(e,t,n=0,r=0){const a=Math.max(0,b(e,0)),i=Math.max(0,b(t,0));if(a<=0||i<=0)return{w:0,h:0};const o=Math.max(0,b(n,0)),s=Math.max(0,b(r,0));if(o<=0||s<=0)return{w:a,h:i};const c=Math.min(a/o,i/s);return{w:Math.max(1,Math.round(o*c)),h:Math.max(1,Math.round(s*c))}}function pp(e,t=""){const n=typeof e=="string"?e:"";return n?`<img src="${n}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent" />`:'<div style="width:100%;height:100%;background:transparent"></div>'}function gp(e,t,n,r){const a=typeof t=="string"?t:"";return a?String(e||"")!==a||String(n||"")!==String(r||""):!1}function hp(e,t,n,r=16){const a=Math.max(1,Math.round(b(t?.w,1))),i=Math.max(1,Math.round(b(t?.h,1))),o=Math.max(a,Math.round(b(n?.width,a))),s=Math.max(i,Math.round(b(n?.height,i))),c=Math.max(0,Math.round(b(r,16))),u=String(e||"bottom-right");return{left:u.includes("left")?c:Math.max(c,o-a-c),top:u.includes("top")?c:Math.max(c,s-i-c),w:a,h:i}}function Xc(e,t,n=16){const r=Math.max(1,Math.round(b(t?.w,1))),a=Math.max(1,Math.round(b(t?.h,1))),i=Math.max(0,Math.round(b(n,16))),o=String(e||"bottom-right");return{w:r,h:a,top:o.includes("top")?i:null,bottom:o.includes("bottom")?i:null,left:o.includes("left")?i:null,right:o.includes("right")?i:null}}function _p(e,t=28,n=6){const r=Math.round(b(e?.left,0)),a=Math.round(b(e?.top,0)),i=Math.max(1,Math.round(b(e?.w,1))),o=Math.max(1,Math.round(b(t,28))),s=Math.max(0,Math.round(b(n,6)));return{left:Math.round(r+(i-o)/2),top:a-s}}function yp(e,t,n=28,r=6,a=16){const i=Xc(e,t,a),o=Math.max(1,Math.round(b(n,28))),s=Math.max(0,Math.round(b(r,6))),c=i.left!=null?i.left:i.right,u=Math.round(b(c,0)+(i.w-o)/2);return{size:o,top:i.top!=null?Math.round(i.top-s):null,bottom:i.bottom!=null?Math.round(i.bottom+i.h+s):null,left:i.left!=null?u:null,right:i.right!=null?u:null}}var ee=Object.freeze({width:64,height:88,gap:8,splitWidth:16,splitExtraMargin:4});function Br(e,t){const n=Math.max(0,Math.floor(b(t,0))),r=Math.max(0,Math.min(Math.floor(b(e,0)),n));return r>0&&r<n?r:0}function bp(e,t,n){const r=Math.max(0,Math.floor(b(n,0))),a=Math.floor(b(e,-1));if(a<0||r<=0)return-1;const i=Br(t,r);if(i<=0)return a<r?a:-1;if(a===i)return-1;const o=a>i?a-1:a;return o>=0&&o<r?o:-1}function wp(e,{count:t=0,selectedCount:n=0,thumbWidth:r=ee.width,gap:a=ee.gap,splitWidth:i=ee.splitWidth,splitExtraMargin:o=ee.splitExtraMargin}={}){const s=Math.max(0,Math.floor(b(t,0)));if(s<=0)return-1;const c=b(e,NaN);if(!Number.isFinite(c)||c<0)return-1;const u=Math.max(1,b(r,ee.width)),d=Math.max(0,b(a,ee.gap)),f=Math.max(0,b(i,ee.splitWidth)),p=Math.max(0,b(o,ee.splitExtraMargin)),m=Br(n,s),g=[];for(let _=0;_<s;_+=1)m>0&&_===m&&g.push({type:"split"}),g.push({type:"thumb",galIdx:_,marginLeft:m>0&&_===m?p:0});let h=0;for(let _=0;_<g.length;_+=1){_>0&&(h+=d);const y=g[_];if(y.type==="split"){if(c>=h&&c<h+f)return-1;h+=f;continue}if(h+=y.marginLeft,c>=h&&c<h+u)return y.galIdx;h+=u}return-1}function vp({count:e=0,selectedCount:t=0,thumbWidth:n=ee.width,gap:r=ee.gap,splitWidth:a=ee.splitWidth,splitExtraMargin:i=ee.splitExtraMargin}={}){const o=Math.max(0,Math.floor(b(e,0)));if(o<=0)return 0;const s=Math.max(1,b(n,ee.width)),c=Math.max(0,b(r,ee.gap)),u=Math.max(0,b(a,ee.splitWidth)),d=Math.max(0,b(i,ee.splitExtraMargin)),f=Br(t,o),p=o+(f>0?1:0);let m=o*s+Math.max(0,p-1)*c;return f>0&&(m+=u+d),m}function xp(e,t,n){const r=Math.max(0,b(t,0)-Math.max(0,b(n,0))),a=b(e,0);return Math.max(0,Math.min(r,a))}function kp(e,t=0,n=1,r=8,a=0){const i=Array.isArray(e)?e:[];if(!i.length)return[];const o=Math.max(0,Math.min(b(t,0),i.length-1)),s=Math.max(1,Math.min(i.length,b(r,8)||8)),c=Math.min(s,1+2*Math.max(0,b(n,1))),u=Math.max(c,s);let d=Math.max(0,o-Math.floor((u-1)/2));const f=Math.min(i.length-1,d+u-1);d=Math.max(0,f-u+1);const p=[],m=new Set,g=_=>{const y=String(i[_]?.id||"");!y||m.has(y)||(m.add(y),p.push(y))},h=Math.max(0,Math.min(i.length,b(a,0)));for(let _=0;_<h;_+=1)g(_);for(let _=d;_<=f&&(g(_),!(p.length>=s));_+=1);return p}function Sp(e,t,n=2,r=[]){const a=Array.isArray(e)?e:[],i=Math.max(0,Math.min(8,b(n,2))),o=b(t?.messageIndex??t?.message_index,NaN),s=String(t?.sessionId||t?.session_id||""),c=String(t?.chatId||t?.chat_id||""),u=String(t?.hash||""),d=new Set,f=[],p=m=>{const g=String(m||"");!g||d.has(g)||(d.add(g),f.push(g))};for(const m of r||[])p(m);for(const m of a){if(!m?.id||s&&m.session_id&&String(m.session_id)!==s||c&&m.chat_id&&String(m.chat_id)!==c)continue;const g=b(m.message_index,NaN);if(Number.isFinite(o)&&Number.isFinite(g)){Math.abs(g-o)<=i&&p(m.id);continue}u&&String(m.content_hash||"")===u&&p(m.id)}return f}function Ap(e,t,n=2){const r=b(e,NaN),a=b(t,NaN);if(!Number.isFinite(r)||!Number.isFinite(a))return!1;const i=Math.max(0,b(n,2));return Math.abs(r-a)<=i}function Mp(e,t,n=2){const r=Math.max(0,Math.floor(b(t,0))),a=Math.max(0,Math.min(Math.max(0,r-1),Math.floor(b(e,0)))),i=Math.max(0,Math.floor(b(n,2)));return r<=0?{lo:0,hi:-1,center:0}:{lo:Math.max(0,a-i),hi:Math.min(r-1,a+i),center:a}}var Qc={chrome:1,content:2,full:3};function Np(e,t){const n=Qc[String(e??"")]||0,r=Qc[String(t??"")]||0;return!n&&!r?"full":r>=n?t||e||"full":e||t||"full"}function el(e){const t=String(e||"").trim();if(!t)return{appearance:"",attire:"",accessories:"",text:"",gender:""};let n=null;const r=t.match(/```(?:json)?\s*([\s\S]*?)```/i),a=(r?r[1]:t).trim().match(/\{[\s\S]*\}/);if(a)try{const o=JSON.parse(a[0]);n=o&&typeof o=="object"?o:null}catch{n=null}if(n&&typeof n=="object"){const o=String(n.appearance??n.look??n.identity??"").trim(),s=String(n.attire??n.clothing??n.outfit??"").trim(),c=String(n.accessories??n.accessory??n.props??"").trim(),u=String(n.gender??n.sex??"").trim().toLowerCase(),d=["girl","female","f","woman"].includes(u)?"girl":["boy","male","m","man"].includes(u)?"boy":u==="other"?"other":"";return{appearance:o,attire:s,accessories:c,text:[o,s,c].filter(Boolean).join(", "),gender:d}}const i=t.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim();return{appearance:i,attire:"",accessories:"",text:i,gender:""}}function Ip(e={}){const t=!!e.warmBusy,n=Math.max(0,Math.min(100,Math.round(b(e.warmPct,0)))),r=String(e.jobState||""),a=Math.max(0,Math.min(100,Math.round(b(e.jobPct,0))));return t?{pct:Math.max(t?6:0,n),busy:!0,label:"인덱싱"}:r==="tagging"?{pct:Math.max(6,a),busy:!0,label:"인덱싱"}:{pct:0,busy:!1,label:"인덱싱"}}function Ep(e={}){const t=!!e.jobBusy,n=!!e.indexBusy,r=Math.max(t?6:0,Math.min(100,Math.round(b(e.jobPct,0)))),a=Math.max(n?6:0,Math.min(100,Math.round(b(e.indexPct,0)))),i=e.error?"#f87171":"#7c6cff",o="#2dd4bf",s=(c,u)=>`<span style="display:block;height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${c}%;background:${u};border-radius:inherit"></span></span>`;return`<span style="flex:0 0 132px;display:flex;flex-direction:column;gap:3px;justify-content:center">${s(r,i)}${s(a,o)}</span>`}function Rr(e){return Math.max(0,Math.min(100,b(e,0)))}function di(e,t){const n=Math.max(1,b(t,1));return Math.max(0,Math.min(b(e,0),n-1))/n*100}function jp(e,t=0,n=1,r=null){if(r&&r.forceEven)return di(t,n);const a=e?.y_percent??e?.anchor_percent??e?.read_percent,i=Number(a);return Number.isFinite(i)?Rr(i):di(t,n)}function tl(e,t,n=.5){if(!e)return null;const r=Math.max(1,b(e.height,0)),a=Math.max(0,b(t,0))*(Number.isFinite(n)?n:.5);return a<b(e.top,0)||a>b(e.bottom,0)?null:Rr((a-b(e.top,0))/r*100)}function $p(e,t,n=.5){const r=tl(e,t,n);if(r!=null)return r;const a=Math.max(0,b(t,0))*(Number.isFinite(n)?n:.5);return b(e?.bottom,0)<a?100:0}function Cp(e,t){const n=Array.isArray(e)?e:[];if(!n.length)return-1;const r=Rr(t),a=n.map(c=>Rr(c)),i=a.reduce((c,u,d)=>u<=20?c.concat(d):c,[]),o=i.length===1&&a[i[0]]>0?a.map((c,u)=>u===i[0]?1:c):a;if(o[0]>0&&r<o[0])return-1;let s=0;for(let c=0;c<o.length;c+=1)r>=o[c]&&(s=c);return s}X(),W(),Dt(),ce(),yt(),F(),$a(),Va(),kr(),Ha(),he(),lt();function fi(){const e=me(),t=e.events;return{last_stage:e.last_stage,events:Array.isArray(t)?t.slice(-20):[]}}async function Tp(e){if(e){const t=$(),n={...e};l(n.api_key)&&(t.llm.api_key=l(n.api_key)),delete n.api_key,delete n.api_key_configured,l(n.service_account_json)&&(t.llm.service_account_json=l(n.service_account_json)),delete n.service_account_json,delete n.service_account_configured,Object.keys(n).length&&(t.llm=et(t.llm,n)),await Je()}try{const t=$().llm,n=Sr(t.source),r=Ct(t.provider);return n==="custom"&&!tc(t)?{ok:!1,message:r==="vertex"?"Vertex AI: Model + Service Account JSON(또는 access token)이 필요합니다.":"태깅 LLM Model/API key가 비어 있습니다. NovelAI 키가 아니라 태깅용 LLM 키를 넣으세요."}:(n==="main"||n==="aux")&&!Zn("runLLMModel")?{ok:!1,message:"RisuAI runLLMModel API를 사용할 수 없습니다."}:{ok:!0,message:`LLM ok (${n}): ${(await nn(t,[{role:"user",content:"Reply with exactly: ok"}])).slice(0,120)}`}}catch(t){return{ok:!1,message:String(t?.message||t)}}}async function Op(){const e=$().nai;if(Pn(e)==="comfy")try{if(!Ea(e))return{ok:!1,message:"ComfyUI 워크플로 JSON이 없습니다.",debug:me()};const t=ys({main:"test",neg:"test",captions:[{name:"",prompt:"char1"},{name:"",prompt:"char2"}],nai:e,seed:1}),n=bs(e.comfy_workflow_json,t),r=_s(e),{status:a,data:i}=await ja(`${r}/system_stats`,{method:"GET"});if(a>=400)return{ok:!1,message:`ComfyUI 연결 실패 (HTTP ${a}) · ${r}`,debug:me()};const o=i?.devices?.[0]?.name||i?.system?.os||"ok";return{ok:!0,message:`ComfyUI ok · ${r} · nodes=${Object.keys(n).length} · ${o}`,debug:fi()}}catch(t){return w("comfy.test",{message:String(t?.message||t)},"error"),{ok:!1,message:String(t?.message||t),debug:me()}}if(!l(e.api_key))return{ok:!1,message:"NAI api_key missing",debug:me()};try{const t=l(e.api_key);try{const n=se("nai.test.anlas"),r=await sd(t);return n.end({message:"anlas ok"}),{ok:!0,message:`NAI token ok · Anlas=${JSON.stringify(r)}`,debug:fi()}}catch(n){const r=Ue(e.model||"nai-diffusion-4-5-full");return w("nai.test.anlas",{message:String(n?.message||n)},"warn"),{ok:!0,message:`NAI config present · model=${r} · anlas_skip=${n?.message||n}`,debug:fi()}}}catch(t){return w("nai.test",{message:String(t?.message||t)},"error"),{ok:!1,message:String(t?.message||t),debug:me()}}}async function Pp(){const e=$().nai,t=l(e.api_key);if(!t)return{ok:!1,message:"NAI api_key missing",debug:me()};const n=String(me().job_ctx??"");yn("probe-nai");const r=se("nai.probe");try{w("nai.probe.start",{message:"tiny generate"});const a={prompt:"1girl, solo, simple background, best quality",negative_prompt:"lowres, bad quality",width:512,height:768,steps:10,cfg_scale:5,cfg_rescale:0,sampler:"k_euler_ancestral",scheduler:"karras",model:Ue(e.model||"nai-diffusion-4-5-full"),var_plus:!1,characters:[],seed:Math.floor(Math.random()*4294967295)||1},i=l(e.request_url)||"https://image.novelai.net/ai/generate-image",o=await vs(t,a,i,{timeoutMs:9e4}),s=o.raw_bytes.byteLength,c=vn(pe(o.raw_bytes));return r.end({bytes:s,is_png:c,seed:o.seed}),{ok:!0,message:`probe ok · png=${c} · ${s}B · seed=${o.seed}`,bytes:s,is_png:c,seed:o.seed,debug:me()}}catch(a){return r.fail(a),{ok:!1,message:String(a?.message||a),debug:me()}}finally{yn(n)}}async function Lp(e,t){if(!e?.byteLength)throw new Error("image is empty");const n=await ru(e),r=n.bytes,a=n.mime||"image/png",i=n.filename||"image.png",o=`data:${a};base64,${await Ze(r)}`,s=nr(await ue("autotag"))||["Tag ONE character reference image into Danbooru-style English prompts.",'Return ONE JSON object only: {"gender":"girl|boy","appearance":"...","attire":"...","accessories":"..."}.',"gender must be exactly girl or boy from visual evidence. appearance = identity/hair/eyes/body (no clothes). attire = clothing + permanent jewelry (earrings/glasses/watch/earbuds). accessories = weapons/bags/held props/ID only (not jewelry)."].join(`
`);w("autotag.start",{message:`llm-vision ${i} ${r.length}B`,bytes:r.length,focus:!0,source:Sr($().llm.source)});const c=[{role:"system",content:s},{role:"user",content:[{type:"text",text:"Tag this character image. JSON only with gender, appearance, attire, accessories."},{type:"image_url",image_url:{url:o}}]}];let u="";try{u=await nn($().llm,c)}catch(v){throw w("autotag.llm.fail",{message:String(v?.message||v)},"error"),new Error(`오토태그 LLM 실패: ${String(v?.message||v).slice(0,240)}`)}const d=el(u),f=l(d.appearance||"",4e3),p=l(d.attire||"",4e3),m=l(d.accessories||"",4e3),g=l(d.gender||"",20),h=l(d.text||[f,p,m].filter(Boolean).join(", "),8e3);if(!f&&!p&&!m)throw new Error("LLM이 외형/의상/악세사리 태그를 반환하지 않았습니다. 비전(이미지) 지원 모델인지 확인하세요.");const _=h.split(",").map(v=>v.trim()).filter(Boolean);w("autotag.done",{message:`gender=${g||"-"} app=${f.length} attire=${p.length} acc=${m.length}`,focus:!0});const y={ok:!0,appearance:f,attire:p,accessories:m,tags:_,text:h,count:_.length,threshold:Number(t||.2),engine:"llm-vision"};return g&&(y.gender=g),y}F();function Bp(e){const t=e.indexOf("?");if(t<0)return{pathname:e,query:{}};const n=e.slice(0,t),r=new URLSearchParams(e.slice(t+1)),a={};for(const[i,o]of r.entries()){const s=a[i];s===void 0?a[i]=o:Array.isArray(s)?s.push(o):a[i]=[s,o]}return{pathname:n,query:a}}function qn(e,t,n=""){const r=e[t];return Array.isArray(r)?r[0]??n:r??n}function Rp(e,t={}){const n=l(e.auth_token,4e3);if(!n)return!0;const r=String(t.Authorization||t.authorization||"");let a=r.toLowerCase().startsWith("bearer ")?r.slice(7):r;if(a=a||String(t["X-Inlay-Nexus-Token"]||t["x-inlay-nexus-token"]||""),typeof a!="string"||a.length!==n.length)return!1;let i=0;for(let o=0;o<n.length;o+=1)i|=a.charCodeAt(o)^n.charCodeAt(o);return i===0}W(),ce(),F(),X(),vo(),he(),lt(),Jn();var T=(...e)=>t=>e.includes(t)?"":null,He=e=>t=>t.startsWith(e)?t.slice(e.length):null,mi=(e,t)=>n=>n.startsWith(e)&&n.endsWith(t)?n.slice(e.length,n.length-t.length):null,k=e=>({status:200,data:e}),pi=e=>({status:200,data:e,contentType:"image/png",raw:!0}),Wn=e=>{throw pt(404,{ok:!1,...te(e,"not_found")},e)};function gi(e){let t=e.image_b64||e.data||"";return typeof t=="string"&&t.startsWith("data:")&&(t=t.split(",",2)[1]??""),String(t||"")}var Dp=[{match:T("/v1/settings/export"),handler:()=>k({ok:!0,json:Af()})},{match:T("/v1/settings"),handler:()=>k({ok:!0,settings:Ir()})},{match:T("/v1/curation/status"),handler:async()=>k({ok:!0,status:await Un()})},{match:T("/v1/curation/catalog"),handler:async()=>k({ok:!0,catalog:await ut()})},{match:T("/v1/prompts"),handler:async()=>k({ok:!0,prompts:await Nr()})},{match:T("/v1/prompts/export"),handler:async()=>k({ok:!0,...await vf()})},{match:He("/v1/prompts/"),handler:async({param:e})=>k({ok:!0,key:e,text:await ue(e)})},{match:He("/v1/jobs/"),handler:async({param:e})=>k(await jm(e))},{match:He("/v1/gallery/explore"),handler:async({query:e})=>k(await am(Number(qn(e,"limit","400"))))},{match:T("/v1/gallery/favorites"),handler:async()=>k(await Ec())},{match:He("/v1/gallery"),handler:async({query:e})=>k(await im(qn(e,"session_id"),Number(qn(e,"limit","40"))))},{match:T("/v1/nai/reference.png"),handler:async()=>pi(await bc()??Wn("no reference"))},{match:T("/v1/nai/vibe.png"),handler:async()=>pi(await zf()??Wn("no vibe"))},{match:T("/v1/nai/reference"),handler:async()=>{const e=await Bf();return k({ok:!0,configured:e,image_reference:$().nai?.image_reference||"none",preview_url:e?"/v1/nai/reference.png":""})}},{match:T("/v1/nai/vibe"),handler:async()=>{const e=await Df();return k({ok:!0,configured:e,vibe_transfer:$().nai?.vibe_transfer||"none",preview_url:e?"/v1/nai/vibe.png":""})}},{match:He("/v1/characters"),handler:async({query:e})=>k(await Tn(qn(e,"session_id"),qn(e,"character_id")))},{match:He("/v1/appearance/"),handler:async({param:e})=>k(await Tn(e))},{match:He("/v1/images/"),handler:async({param:e})=>{let t=e.replace(/^\/+|\/+$/g,"");if(t.endsWith(".json")){const n=await Tt(t.slice(0,-5));return Object.keys(n).length||Wn("location missing"),k(n)}return t.endsWith(".png")&&(t=t.slice(0,-4)),pi(await jc(t)??Wn("image missing"))}}],Fp=[{match:T("/v1/settings/reset"),handler:async()=>k(await Nf())},{match:T("/v1/settings/import"),handler:async({body:e})=>k(await Mf(String(e.json||e.text||"")))},{match:T("/v1/settings","/v1/settings/update"),handler:async({body:e})=>k(await Ef(e))},{match:T("/v1/curation/catalog"),handler:async({body:e})=>{const t=e.catalog??e;return k(await sc(t))}},{match:T("/v1/curation/catalog/reset"),handler:async()=>k(await cc())},{match:T("/v1/curation/embed"),handler:async()=>k(await lc())},{match:T("/v1/curation/embed/test"),handler:async()=>k(await uc())},{match:T("/v1/curation/settings"),handler:async({body:e})=>k(await _c(e))},{match:T("/v1/prompts/import"),handler:async({body:e})=>k(await xf(e?.json!=null?e.json:(e?.prompts!=null,e)))},{match:T("/v1/prompts/reset-defaults"),handler:async({body:e})=>k(await kf({keep_author_note:e?.keep_author_note!==!1&&e?.keepAuthorNote!==!1}))},{match:mi("/v1/prompts/","/reset"),handler:async({param:e})=>k(await ac(e,Sn(e)))},{match:He("/v1/prompts/"),handler:async({param:e,body:t})=>k(await ac(e,String(t.text||"")))},{match:T("/v1/jobs/create","/v1/jobs"),handler:async({body:e})=>({status:202,data:await Dc(e)})},{match:T("/v1/gallery/unlink","/v1/cards/unlink"),handler:async({body:e})=>k(await ni(String(e.session_id||""),String(e.content_hash||""),e.message_index))},{match:T("/v1/gallery/rebind-hash","/v1/cards/rebind-hash"),handler:async({body:e})=>k(await om({session_id:String(e.session_id||e.sessionId||""),card_ids:e.card_ids||e.ids||[],to_hash:String(e.to_hash||e.content_hash||""),assistant_preview:String(e.assistant_preview||e.assistant_text||"")}))},{match:T("/v1/gallery/delete","/v1/cards/delete"),handler:async({body:e})=>{const t=l(e.folder_key||"",400),n=l(e.card_id||e.id||"",80),r=Array.isArray(e.card_ids)?e.card_ids:null;if(t)return k(await dm(t));if(r?.length)return k(await sm(r));if(n)return k(await ai(n));const a="card_id or folder_key required";throw pt(400,{ok:!1,...te(a,"bad_request")},a)}},{match:T("/v1/gallery/export"),handler:async({body:e})=>k(await lm(e))},{match:T("/v1/gallery/import"),handler:async({body:e})=>k(await um(e))},{match:T("/v1/gallery/favorites"),handler:async({body:e})=>Array.isArray(e.ids)?k(await cm(e.ids)):k(await Ec())},{match:mi("/v1/cards/","/tags"),handler:async({param:e,body:t})=>k(await Tm(e,t))},{match:mi("/v1/cards/","/reroll"),handler:async({param:e,body:t})=>k(await Fc(e,String(t.mode||"nai"),t.overrides))},{match:T("/v1/messages/reroll","/v1/gallery/reroll-message"),handler:async({body:e})=>k(await Om({session_id:String(e.session_id||e.sessionId||""),content_hash:String(e.content_hash||e.contentHash||""),message_index:Number(e.message_index??e.messageIndex??-1)}))},{match:T("/v1/characters/global-toggles","/v1/characters/global_toggles"),handler:async({body:e})=>k(await Iu(String(e.character_id||""),e.disabled_globals||e.disabled||[]))},{match:T("/v1/characters/unify","/v1/characters/merge"),handler:async({body:e})=>k(await os(String(e.target_session_id||e.session_id||""),e.source_session_ids||e.session_ids||[],e.include_target!==!1))},{match:T("/v1/characters","/v1/characters/update"),handler:({body:e})=>zp(e)},{match:He("/v1/appearance/"),handler:async({param:e,body:t})=>t.characters!=null||t.global!=null?(t.characters!=null&&await Cn(e,t.characters||[],{prune:!0}),t.global!=null&&await Cn(Ve,t.global||[],{prune:!0}),k(await Tn(e))):k(await Pu(e,t.appearance||{}))},{match:T("/v1/models/test"),handler:async({body:e})=>k(await Tp(e.llm&&typeof e.llm=="object"?e.llm:null))},{match:T("/v1/nai/test"),handler:async()=>k(await Op())},{match:T("/v1/nai/probe","/v1/debug/probe-nai"),handler:async()=>k(await Pp())},{match:T("/v1/debug/clear"),handler:()=>(Ur(),k({ok:!0,cleared:!0}))},{match:T("/v1/nai/reference","/v1/nai/reference/upload"),handler:async({body:e})=>{if(e.clear)return k(await wc());const t=gi(e);if(!l(t))throw new Error("image_b64 required");return k(await Rf(Q(Re(t))))}},{match:T("/v1/nai/reference/clear"),handler:async()=>k(await wc())},{match:T("/v1/nai/vibe","/v1/nai/vibe/upload"),handler:async({body:e})=>{const t=l(e.preset_id||e.presetId||"",120);if(e.clear)return k(t?await kc(t):await vc());if(t&&e.copy_from){const a=l(e.copy_from,120),i=a?await Gf(a,t):!1;return k({ok:!0,preset_id:t,configured:i,preview_url:i?Zr(t):""})}const n=gi(e);if(!l(n))throw new Error("image_b64 required");const r={model:e.model,information_extracted:e.information_extracted??e.vibe_transfer_information_extracted,strength:e.strength??e.vibe_transfer_strength};return k(t?await Kf(t,Q(Re(n)),r):await Uf(Q(Re(n)),r))}},{match:T("/v1/nai/vibe/clear"),handler:async({body:e})=>{const t=l(e?.preset_id||e?.presetId||"",120);return k(t?await kc(t):await vc())}},{match:T("/v1/autotag","/v1/autotag/evaluate"),handler:async({body:e})=>{const t=gi(e).replace(/\s+/g,"");if(!t)throw new Error("image_b64 required");const n=Re(t);return k(await Lp(Q(n),Number(e.threshold??.2)))}}];async function zp(e){const t=l(e.session_id||"",200),n=l(e.character_id||"",200),r=(Array.isArray(e.root_session_ids)?e.root_session_ids:Array.isArray(e.cascade_session_ids)?e.cascade_session_ids:[]).map(i=>l(i,200)).filter(Boolean);if("characters"in e&&t&&await Cn(t,e.characters||[],{prune:!0,rootSessionIds:r}),"global"in e&&await Cn(Ve,e.global||[],{prune:!0}),"character"in e){const i=l(e.scope||t||"__global__",200);r.length&&i!=="__global__"?await is(r,[e.character||{}],""):await ot(i,e.character||{})}const a=Array.isArray(e.root_delete)?e.root_delete:Array.isArray(e.cascade_delete)?e.cascade_delete:[];return a.length&&r.length&&await Tu(r,a,""),r.length&&t&&await os(t,r,!1),k(await Tn(t,n))}async function nl(e,t){for(const n of e){const r=n.match(t.pathname);if(r!==null)return n.handler({...t,param:r})}return Wn(t.pathname)}async function Up(e,t={}){const{pathname:n,query:r}=Bp(e),a=String(t.method||"GET").toUpperCase();let i;if(typeof t.body=="string")try{i=JSON.parse(t.body)}catch{i={}}else i=t.body??{};if(["/v1/health","/healthz","/readyz"].includes(n))return k({ok:!0,health:If()});if(n==="/v1/debug"||n==="/v1/debug/log")return a==="DELETE"||a==="POST"&&i.clear?(Ur(),k({ok:!0,cleared:!0})):k(me());if(!Rp($(),t.headers||{})){const s="invalid token";throw pt(401,{ok:!1,...te(s,"unauthorized")},s)}const o={method:a,pathname:n,query:r,body:i};if(a==="GET")return nl(Dp,o);if(["POST","PUT","PATCH"].includes(a))try{return await nl(Fp,o)}catch(s){if(Ti(s))throw s;const c=String(s?.message||s);throw pt(500,{ok:!1,...te(c,"internal")},c)}throw pt(405,{ok:!1,...te(a,"method_not_allowed")},a)}X(),W(),Dt(),mr(),rc(),$e(),he(),lt();var Dr=null;async function Jp(){w("boot.ready.start",{message:We}),await at();const e=await fr().catch(r=>{throw w("boot.storage",{message:String(r?.message||r)},"error"),r});w("boot.storage",{message:e.kind}),rr(await bf()),await wf(),await Bu(),await Ru();const t=await D("meta","reference_image");t?.png&&Vr(Mt(t.png));const n=await D("meta","vibe_transfer");n?.png&&Yr(Mt(n.png)),await qf(),w("boot.ready.done",{message:We,has_nativeFetch:Zn("nativeFetch"),has_idb:Zn("getLocalPluginStorage")})}async function hi(){return Dr||(Dr=Jp().catch(e=>{throw Dr=null,e})),await Dr,!0}async function Kp(e,t={},n=12e4){await hi();try{const r=await Up(e,t);if(r.raw)return r.data;if(r.status>=400)throw pt(r.status,r.data);return r.data}catch(r){if(Ti(r))throw r;const a=String(r?.message||r);throw pt(500,{ok:!1,...te(a,"internal")},a)}}async function Gp(e){return await hi(),Yt(e)}function Hp(){Ei(()=>({cards:In("cards"),images:In("images"),jobs:In("jobs"),blob_urls:wu()})),Reflect.set(globalThis,"__INLAY_NATIVE__",{VERSION:We,ready:hi,fetch:Kp,resolveImageUrl:Ce,refPreviewUrl:xo,vibePreviewUrl:ko,ensureImageUrl:Gp,warmImages:Mu,pinImageUrls:Au,warmProgress:xu,onWarmProgress:ku,debug:me,clearDebug:Ur})}var qp=sn({applyExplorerClick:()=>Yp,clearSelection:()=>Xp,createSelectionState:()=>Wp,moveFocus:()=>Qp,reorderByIds:()=>ng,selectAll:()=>Zp,sortExplorerItems:()=>eg,thumbMinWidth:()=>tg,visibleIds:()=>Vp});function Wp(e=[]){return{selected:new Set((e||[]).map(String).filter(Boolean)),anchorId:"",focusId:""}}function Vp(e=[]){return(e||[]).map(t=>String(t?.id||"")).filter(Boolean)}function Yp(e,t,{index:n,ids:r,shift:a=!1,ctrl:i=!1}={}){const o={selected:new Set(e?.selected||[]),anchorId:String(e?.anchorId||""),focusId:String(e?.focusId||"")},s=String(t||"");if(!s)return o;const c=Array.isArray(r)?r.map(String):[],u=typeof n=="number"&&Number.isFinite(n)?n:c.indexOf(s);if(a&&o.anchorId&&c.length){const d=c.indexOf(o.anchorId),f=u>=0?u:c.indexOf(s);if(d>=0&&f>=0){const p=Math.min(d,f),m=Math.max(d,f);return o.selected=new Set(c.slice(p,m+1)),o.focusId=s,o}}return i?(o.selected.has(s)?o.selected.delete(s):o.selected.add(s),o.anchorId=s,o.focusId=s,o):(o.selected=new Set([s]),o.anchorId=s,o.focusId=s,o)}function Zp(e,t=[]){return{selected:new Set((t||[]).map(String).filter(Boolean)),anchorId:String(e?.anchorId||t?.[0]||""),focusId:String(e?.focusId||t?.[0]||"")}}function Xp(e=null){return{selected:new Set,anchorId:String(e?.anchorId||""),focusId:""}}function Qp(e=[],t="",n=1){const r=(e||[]).map(String).filter(Boolean);if(!r.length)return"";const a=r.indexOf(String(t||""));return a<0?r[0]:r[Math.max(0,Math.min(r.length-1,a+n))]}function eg(e=[],t="newest"){const n=[...e||[]],r=(a,i=0)=>{const o=Number(a);return Number.isFinite(o)?o:i};return t==="oldest"?n.sort((a,i)=>r(a.created_at)-r(i.created_at)||String(a.id).localeCompare(String(i.id))):t==="message"?n.sort((a,i)=>r(a.message_index,1e9)-r(i.message_index,1e9)||r(a.shot_index)-r(i.shot_index)||r(i.created_at)-r(a.created_at)):t==="shot"?n.sort((a,i)=>r(a.shot_index)-r(i.shot_index)||r(a.message_index,1e9)-r(i.message_index,1e9)||r(i.created_at)-r(a.created_at)):n.sort((a,i)=>r(i.created_at)-r(a.created_at)||String(i.id).localeCompare(String(a.id)))}function tg(e="m"){return e==="s"?96:e==="l"?200:148}function ng(e=[],t=[]){const n=i=>{const o=i&&typeof i=="object"?i.id:void 0;return String(o??i)},r=new Map((e||[]).map(i=>[n(i),i])),a=[];for(const i of t||[]){const o=String(i);r.has(o)&&(a.push(r.get(o)),r.delete(o))}for(const i of r.values())a.push(i);return a}kr(),Ws();function rg(){Reflect.set(globalThis,"__INLAY_VIEWER_CORE__",{...Pm}),Reflect.set(globalThis,"__INLAY_LLM__",{...uf}),Reflect.set(globalThis,"__INLAY_EMBED__",{EMBEDDING_PROVIDERS:Ka,normalizeEmbeddingProvider:Me,defaultEndpointForEmbedding:vr,defaultModelForEmbedding:Dn,embeddingModelPlaceholder:tf,shouldAutoReplaceEmbeddingEndpoint:rf,shouldAutoReplaceEmbeddingModel:af,embeddingProviderNeedsApiKey:of}),Reflect.set(globalThis,"__INLAY_LORE_EXTRA__",{...pm}),Reflect.set(globalThis,"__INLAY_EXPLORER__",{...qp})}X(),W(),rg(),Hp(),w("boot.loaded",{message:We})})();
const style = document.createElement("style");style.textContent = ":root{--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light dark;color:canvastext;background:canvas;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}@media (prefers-color-scheme:dark){:root{--lightningcss-light: ;--lightningcss-dark:initial}}body{margin:0}.risu-panel{box-sizing:border-box;place-items:center;min-height:100dvh;padding:24px;display:grid}.risu-card{border:1px solid color-mix(in srgb, CanvasText 18%, transparent);background:color-mix(in srgb, Canvas 94%, CanvasText 6%);width:min(640px,100%);box-shadow:0 18px 50px color-mix(in srgb, CanvasText 14%, transparent);border-radius:20px;padding:24px}.risu-header{justify-content:space-between;align-items:start;gap:16px;display:flex}.risu-title{margin:0;font-size:1.35rem;line-height:1.2}.risu-subtitle{color:color-mix(in srgb, CanvasText 70%, transparent);margin:8px 0 0}.risu-grid{gap:10px;margin-top:24px;display:grid}.risu-row{border-top:1px solid color-mix(in srgb, CanvasText 12%, transparent);grid-template-columns:minmax(120px,.4fr) 1fr;gap:12px;padding:12px 0;display:grid}.risu-label{color:color-mix(in srgb, CanvasText 66%, transparent)}.risu-value{overflow-wrap:anywhere}.risu-button{color:canvas;cursor:pointer;font:inherit;background:canvastext;border:0;border-radius:999px;padding:10px 16px}.risu-button:focus-visible{outline-offset:3px;outline:3px solid highlight}.risu-error{border-color:color-mix(in srgb, #ef4444 56%, CanvasText 18%)}.risu-error-message{color:color-mix(in srgb, #ef4444 88%, CanvasText 12%);overflow-wrap:anywhere;margin:16px 0 0}\n/*$vite$:1*/";document.head.append(style);
var Zt = "inlay-nexus-native", ea = "Inlay Nexus", He = "2.1.1", rn = class extends Error {
  segment;
  constructor($) {
    super(`Storage key segment must be non-empty and cannot contain colon: ${$}`), this.segment = $, this.name = "PluginStorageKeyError";
  }
};
function on($) {
  const L = [
    $.pluginName,
    $.scope,
    ...$.ids,
    $.key
  ];
  for (const M of L) if (M.length === 0 || M.includes(":")) throw new rn(M);
  return L.join(":");
}
function ta($, L, M) {
  return on({
    pluginName: Zt,
    scope: $,
    ids: L,
    key: M
  });
}
async function Kt($) {
  return await risuai.pluginStorage.getItem(ta("global", [], $));
}
async function Jt($, L) {
  await risuai.pluginStorage.setItem(ta("global", [], $), L);
}
var sn = class {
  generation = 0;
  tail = Promise.resolve();
  run($) {
    const L = ++this.generation, M = this.tail.then(async () => {
      if (L === this.generation)
        return $();
    });
    return this.tail = M.catch(() => {
    }), M;
  }
}, Xt = ($) => String($ ?? "").replace(/\r\n/g, `
`).split(`
`).map((L) => L.trim()).filter(Boolean), ln = ($) => String($ ?? "").replace(/<br\s*\/?>/gi, `
`).replace(/<\/(?:p|div|li|blockquote|h[1-6]|tr)>/gi, `
`).replace(/<(?:p|div|li|blockquote|h[1-6]|tr)(?:\s[^>]*)?>/gi, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/[^\S\n]+/g, " ").replace(/ *\n */g, `
`).replace(/\n{2,}/g, `
`).trim(), ft = ($) => Math.max(0, Math.min(100, $)), aa = ($, L = 0.42) => Math.max(0, $) * (Number.isFinite(L) ? L : 0.42), na = ($, L, M = 0.42) => {
  const V = Math.max(1, $.height), Y = aa(L, M);
  return Y < $.top || Y > $.bottom ? null : ft((Y - $.top) / V * 100);
}, cn = ($, L, M = 0.42) => {
  const V = na($, L, M);
  if (V != null) return V;
  const Y = aa(L, M);
  return $.bottom < Y ? 100 : ($.top > Y, 0);
}, dn = ($, L) => {
  if (!$.length) return -1;
  const M = ft(Number(L)), q = $.map((Y) => ft(Number(Y) || 0)), ne = q.reduce((Y, te, ae) => (te <= 20 ? Y.concat(ae) : Y), []);
  const V = ne.length === 1 && q[ne[0]] > 0 ? q.map((Y, te) => te === ne[0] ? 1 : Y) : q;
  if (V[0] > 0 && M < V[0]) return -1;
  let Y = 0;
  for (let te = 0; te < V.length; te += 1) M >= V[te] && (Y = te);
  return Y;
}, gt = ($, L) => {
  const M = Math.max(1, L);
  return Math.max(0, Math.min($, M - 1)) / M * 100;
}, ht = ($) => {
  const L = String($ || "").replace(/\r\n/g, `
`);
  if (!/\[Positive\]/i.test(L)) return null;
  const M = L.match(/\[Positive\]\s*([\s\S]*?)(?=\s*\[Negative\]|$)/i), V = L.match(/\[Negative\]\s*([\s\S]*?)\s*$/i), Y = (M?.[1] || "").trim(), q = (V?.[1] || "").trim();
  return !Y && !q ? null : {
    positive: Y,
    negative: q
  };
}, mt = ($, L) => `${String($ || "preset").toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "preset"}_${L}_${Math.random().toString(36).slice(2, 7)}`, Qt = ($, L) => {
  if (!$ || typeof $ != "object") return null;
  const M = $, V = String(M.name || M.comment || M.title || `프리셋 ${L + 1}`).trim();
  let Y = String(M.positive || M.pos || "").trim(), q = String(M.negative || M.neg || "").trim();
  if (!Y && !q && typeof M.content == "string") {
    const ne = ht(M.content);
    if (!ne) return null;
    Y = ne.positive, q = ne.negative;
  }
  let cfgScale = null, cfgRescale = null;
  if (M.cfg_scale != null && M.cfg_scale !== "") {
    const nCfg = Number(M.cfg_scale);
    Number.isFinite(nCfg) && (cfgScale = nCfg);
  }
  if (M.cfg_rescale != null && M.cfg_rescale !== "") {
    const nRs = Number(M.cfg_rescale);
    Number.isFinite(nRs) && (cfgRescale = nRs);
  }
  return !Y && !q && cfgScale == null && cfgRescale == null ? null : {
    id: String(M.id || mt(V, L)),
    name: V,
    positive: Y,
    negative: q,
    cfg_scale: cfgScale,
    cfg_rescale: cfgRescale
  };
}, pn = ($) => {
  const L = String($ || "").trim();
  if (!L) return [];
  if (!L.startsWith("{") && !L.startsWith("[") && /\[Positive\]/i.test(L)) {
    const q = ht(L);
    return q ? [{
      id: mt("imported", 0),
      name: "가져온 프리셋",
      positive: q.positive,
      negative: q.negative
    }] : [];
  }
  let M;
  try {
    M = JSON.parse(L);
  } catch {
    return [];
  }
  const V = [], Y = (q) => {
    if (!q) return;
    const ne = `${q.name}::${q.positive.slice(0, 80)}`;
    V.some((ie) => `${ie.name}::${ie.positive.slice(0, 80)}` === ne) || V.push(q);
  };
  if (Array.isArray(M))
    return M.forEach((q, ne) => Y(Qt(q, ne))), V;
  if (M && typeof M == "object") {
    const q = M;
    if (Array.isArray(q.presets) && (q.presets.forEach((ie, se) => Y(Qt(ie, se))), V.length))
      return V;
    const ne = (q.data?.character_book || q.character_book || q.data?.characterBook)?.entries;
    Array.isArray(ne) && ne.forEach((ie, se) => {
      if (!ie || typeof ie != "object") return;
      const be = ie, Te = String(be.content || ""), k = ht(Te);
      if (!k) return;
      const t = String(be.comment || be.name || `프리셋 ${se + 1}`).trim().replace(/^프리셋\s*/i, (Ae) => Ae);
      Y({
        id: mt(t, se),
        name: t || `프리셋 ${se + 1}`,
        positive: k.positive,
        negative: k.negative
      });
    });
  }
  return V;
}, un = ($, L) => {
  const M = [...$ || []];
  for (const V of L || []) {
    const Y = M.findIndex((q) => q.name === V.name);
    Y >= 0 ? M[Y] = {
      ...M[Y],
      positive: V.positive,
      negative: V.negative,
      cfg_scale: V.cfg_scale,
      cfg_rescale: V.cfg_rescale
    } : M.push(V);
  }
  return M;
};
async function gn() {
  "use strict";
  const $ = ea, L = "http://127.0.0.1:28120", M = "inlay-nx-launcher", V = "inlay-nx-gallery-root", Y = "inlay-nx-overlay-root", q = "inlay-nx-debug-root", ne = "viewerGeo", iconStoreKey = "viewerIconGeo", ie = "viewerCastOpen", minStoreKey = "viewerMinimized", se = {
    left: 24,
    top: 72,
    w: 380,
    h: 560
  }, iconSe = {
    left: 24,
    top: 120
  }, be = 24, Te = 250, pinYDefault = 120, pinXPctDefault = 38, pinYPctDefault = 80, k = globalThis.risuai || globalThis.Risuai || null;
  if (!k) {
    console.warn(`[${$}] RisuAI API is unavailable.`);
    return;
  }
  const t = {
    settings: null,
    settingsAt: 0,
    backendSettings: null,
    prompts: [],
    promptDrafts: {},
    uiOpen: !1,
    uiTab: "dashboard",
    uiRenderGen: 0,
    uiMessage: null,
    uiBusy: "",
    health: null,
    replacerReady: !1,
    replacerError: "",
    pendingBySession: /* @__PURE__ */ new Map(),
    timersBySession: /* @__PURE__ */ new Map(),
    lastScope: null,
    scopeOverride: null,
    activeJobId: "",
    gallery: [],
    appearance: {},
    charactersSession: [],
    charactersGlobal: [],
    disabledGlobals: [],
    viewerOpen: !1,
    viewerIndex: 0,
    pollTimer: null,
    unloading: !1,
    modelTestResults: {},
    launcherMounted: !1,
    launcherDoc: null,
    launcherBtn: null,
    launcherPointerId: null,
    galleryUi: null,
    overlayUi: null,
    progressUi: null,
    viewerMinimized: !1,
    charEditUi: null,
    cardTagUi: null,
    hostDoc: null,
    overlayScrolling: !1,
    overlayScrollTimer: null,
    overlayRaf: null,
    jobsInFlight: /* @__PURE__ */ new Map(),
    lastOverlayFocusHash: "",
    selectedMessage: null,
    lastImagedMessage: null,
    _pointerClientX: null,
    _pointerClientY: null,
    pendingSessionId: "",
    pendingSessionCount: 0,
    settingsSavePending: null,
    settingsSaveTimer: null,
    settingsSaveInFlight: null,
    settingsWriteGen: 0,
    _presetSwitching: !1,
    activePresetId: "",
    quickButtonRegistered: !1,
    startupRetryTimer: null,
    debugLog: [],
    debugUi: null,
    debugUiTimer: null,
    debugUiOpen: !0,
    debugCompareIndex: null,
    lastJobState: "",
    jobProgress: null,
    debugInsight: null,
    explorer: {
      folders: [],
      items: [],
      folderKey: "",
      query: "",
      loadedAt: 0
    },
    charCatalog: [],
    autotagFocus: null,
    autotagThreshold: 0.2
  };
  function Ae(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "number" || typeof e == "boolean") return String(e);
    if (e instanceof Error) return e.message || String(e);
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  function y(e, n, o = "") {
    const a = {
      t: Date.now(),
      level: e || "info",
      event: String(n || ""),
      detail: z(Ae(o), 700)
    };
    t.debugLog.push(a), t.debugLog.length > Te && t.debugLog.splice(0, t.debugLog.length - Te);
    const r = `[${$}] ${a.event}${a.detail ? ` · ${a.detail}` : ""}`;
    a.level === "error" ? console.warn(r) : (t.settings?.debug || a.level === "warn") && console.log(r), t.debugUi?.refreshSoon && t.debugUi.refreshSoon();
  }
  function Pe(...e) {
    y("warn", e.map(Ae).filter(Boolean).join(" "));
  }
  function We(e, n = 48) {
    return z(w(e, 400).replace(/\s+/g, " "), n);
  }
  function ra() {
    const e = t.gallery || [], n = /* @__PURE__ */ new Map();
    for (const r of e) {
      const i = r.content_hash || `msg${r.message_index ?? "?"}` || "unknown";
      n.has(i) || n.set(i, []), n.get(i).push(r);
    }
    const o = [];
    let a = 0;
    for (const [r, i] of n) {
      const s = [...new Set(i.map((m) => m.paragraph))].sort((m, u) => Number(m) - Number(u)), c = i.map((m) => m.y_percent != null && Number.isFinite(Number(m.y_percent)) ? `${Math.round(Number(m.y_percent))}%` : null).filter(Boolean), l = c.length ? ` y[${c.join(",")}]` : "", p = i[0]?.message_index;
      if (o.push(`  ${String(r).slice(0, 8) || "?"} ×${i.length} msg#${p ?? "-"} P[${s.join(",")}]${l}`), a += 1, a >= 6) break;
    }
    return o.length ? o.join(`
`) : "  (empty)";
  }
  function Ve() {
    const e = t.backendSettings?.card || {}, n = [...t.jobsInFlight.keys()].map((i) => i.slice(0, 8)).join(",") || "-", o = t.selectedMessage, a = t.debugInsight, r = [
      `enabled=${t.settings?.enabled !== !1}`,
      `hook=${t.replacerReady ? "afterRequest" : t.replacerError || "off"}`,
      `power=${e.power !== !1}`,
      `execute=${e.execute || "auto"}`,
      `job=${t.activeJobId || "-"}`,
      `jobState=${t.lastJobState || "-"}`,
      `gallery=${(t.gallery || []).length}`,
      `markers=${t.overlayUi?.markers?.length ?? 0}`,
      `flight=${n}`,
      `session=${t.lastScope?.sessionId || "-"}`,
      "",
      "=== SELECTED (click) ==="
    ];
    if (o ? (r.push(`za hash=${(o.hash || "").slice(0, 16)} session=${o.sessionId || "-"} msg#${o.chatIndex ?? "-"} role=${o.role || "-"} chars=${(o.text || "").length}`), r.push(`char[${o.charSlot ?? "-"}] ${o.characterName || "-"}`), r.push(`chat[${o.chatSlot ?? "-"}] ${o.chatName || "-"}`), r.push(`msg#${o.chatIndex ?? "-"} role=${o.role || "-"} via=${o.matchMethod || "-"}`), r.push(`session=${o.sessionId || "-"}`), r.push(`DOM#${o.domIndex} hash=${(o.hash || "").slice(0, 16)}`), r.push(`chars=${(o.text || "").length} paragraphs=${o.paragraphCount ?? "?"}`), r.push(`hasImage=${o.hasImage ? "YES" : "NO"} cards=${o.cardCount ?? 0}`), r.push(`parasWithImg=P[${(o.paragraphsWithImages || []).join(",") || "-"}]`), r.push(`imgMatch=${o.matchMode || "-"}`), r.push(`preview=${o.preview || "-"}`)) : r.push("없음 — 채팅 메시지를 클릭해서 선택하세요"), r.push("", "=== VISIBLE MSGS ==="), a?.messages?.length) for (const i of a.messages) {
      const s = i.isSelected ? "*" : " ";
      r.push(`${s}#${i.domIndex} hash=${(i.hash || "").slice(0, 8)} img=${i.hasImage ? "Y" : "N"}(${i.cardCount}) ${i.preview}`);
    }
    else r.push("(scan 후 표시)");
    if (r.push("", "=== GALLERY GROUPS ==="), r.push(ra()), a?.markers?.length) {
      r.push("", "=== MARKERS ===");
      for (const i of a.markers.slice(0, 10)) r.push(`  P${i.paragraph} → ${We(i.main || i.id, 40)}`);
    }
    return a?.lastPlace && r.push("", `lastPlace=${a.lastPlace}`), r.push("", "팁: 메시지 본문을 클릭하면 선택됩니다"), r.join(`
`);
  }
  function Ye(e = 80) {
    return t.debugLog.slice(-e).map((n) => `${new Date(n.t).toLocaleTimeString("ko-KR", { hour12: !1 })} [${n.level === "error" ? "E" : n.level === "warn" ? "W" : "I"}] ${n.event}${n.detail ? ` | ${n.detail}` : ""}`).join(`
`);
  }
  function Ke(e) {
    if (e == null) return "";
    if (typeof e == "string") return e;
    if (typeof e == "number" || typeof e == "boolean") return String(e);
    if (Array.isArray(e)) return e.map(Ke).filter(Boolean).join(`
`);
    if (typeof e == "object") {
      if (typeof e.content == "string") return e.content;
      if (typeof e.text == "string") return e.text;
      if (typeof e.data == "string") return e.data;
      if (e.data != null) return Ke(e.data);
    }
    return "";
  }
  function w(e, n = 2e5) {
    return Ke(e).replace(/\u0000/g, " ").replace(/\r\n/g, `
`).trim().slice(0, n);
  }
  function z(e, n = 600) {
    const o = w(e, n * 3).replace(/\s+/g, " ").trim();
    return o.length <= n ? o : `${o.slice(0, Math.max(1, n - 1)).trim()}…`;
  }
  function re(e, n, o, a) {
    const r = Number.parseInt(String(e ?? ""), 10);
    return Number.isFinite(r) ? Math.max(n, Math.min(o, r)) : a;
  }
  function Ne(e, n = 0) {
    const o = Number.parseInt(String(e ?? ""), 10);
    return Number.isFinite(o) ? o : n;
  }
  function xt(e, n = !1) {
    if (e == null || String(e).trim() === "") return n;
    const o = String(e).trim().toLowerCase();
    return [
      "true",
      "1",
      "yes",
      "on",
      "enabled"
    ].includes(o) ? !0 : [
      "false",
      "0",
      "no",
      "off",
      "disabled"
    ].includes(o) ? !1 : n;
  }
  function h(e) {
    return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function ye(e) {
    const n = w(e, 1e6);
    let o = 2166136261, a = 2654435769;
    for (let r = 0; r < n.length; r += 1) {
      const i = n.charCodeAt(r);
      o ^= i, o = Math.imul(o, 16777619), a ^= i + (o << 6 | o >>> 26), a = Math.imul(a, 2246822507);
    }
    return `${(o >>> 0).toString(16).padStart(8, "0")}${(a >>> 0).toString(16).padStart(8, "0")}`;
  }
  async function D(e, n, o = null) {
    try {
      return await n();
    } catch (a) {
      return Pe(e, a), o;
    }
  }
  async function we(e) {
    if (typeof k.getArgument == "function")
      return D(`getArgument:${e}`, () => k.getArgument(e), void 0);
  }
  async function ve() {
    const e = Date.now();
    if (t.settings && e - t.settingsAt < 800) return t.settings;
    const n = {
      enabled: xt(await we("inlay_enabled"), !0),
      backendUrl: w(await we("inlay_backend_url")) || L,
      backendToken: w(await we("inlay_backend_token")),
      requestTimeoutMs: re(await we("inlay_request_timeout_ms"), 5e3, 6e5, 12e4),
      captureDelayMs: re(await we("inlay_capture_delay_ms"), 0, 1e4, 1400),
      debug: xt(await we("inlay_debug"), !1)
    };
    return t.settings = n, t.settingsAt = e, n;
  }
  function Ue(e, n) {
    return `${String(e || "").replace(/\/+$/, "")}/${String(n || "").replace(/^\/+/, "")}`;
  }
  async function K(e, n = {}, o = null) {
    const a = await ve(), r = re(o, 500, 6e5, a.requestTimeoutMs);
    const N = globalThis.__INLAY_NATIVE__;
    if (!N || typeof N.fetch != "function") throw new Error("Inlay Nexus backend unavailable");
    await N.ready();
    return N.fetch(e, n, r);
  }
  async function bt() {
    try {
      const e = await K("/v1/health", { method: "GET" }, 5e3);
      return t.health = e?.health || e, {
        ok: !0,
        health: t.health
      };
    } catch (e) {
      return t.health = null, {
        ok: !1,
        error: z(e?.message || e)
      };
    }
  }
  function presetIdEq(a, b) {
    return String(a || "") === String(b || "");
  }
  function resolveActivePresetId(card) {
    const presets = Array.isArray(card?.presets) ? card.presets : [];
    const preferred = String(t.activePresetId || "");
    if (preferred && presets.some((p) => presetIdEq(p.id, preferred))) return preferred;
    const cur = String(card?.active_preset_id || "");
    if (cur && presets.some((p) => presetIdEq(p.id, cur))) return cur;
    return String(presets[0]?.id || "");
  }
  function pinActivePreset(card, presetId) {
    const id = String(presetId || "");
    if (!card || !id) return card;
    t.activePresetId = id, card.active_preset_id = id;
    return card;
  }
  async function le() {
    const writeGen = t.settingsWriteGen || 0, preferred = String(t.activePresetId || "");
    const e = await K("/v1/settings", { method: "GET" });
    // A newer local PUT (viewer/card) won while this GET was in flight — keep local.
    if ((t.settingsWriteGen || 0) !== writeGen) return t.backendSettings;
    let incoming = e?.settings || null;
    if (incoming && t.settingsSavePending) incoming = mergeSettingsPatch(incoming, t.settingsSavePending);
    // Viewer/card choice is source of truth until explicitly changed again.
    if (incoming?.card && preferred) {
      const presets = Array.isArray(incoming.card.presets) ? incoming.card.presets : [];
      if (presets.some((p) => presetIdEq(p.id, preferred))) {
        incoming.card.active_preset_id = preferred;
        const active = presets.find((p) => presetIdEq(p.id, preferred));
        active && (incoming.card.custom_pos = active.positive || "", incoming.card.custom_neg = active.negative || "");
      }
    } else if (incoming?.card?.active_preset_id) t.activePresetId = String(incoming.card.active_preset_id);
    if (incoming?.card) normalizeLoadedPinCard(incoming.card);
    return t.backendSettings = incoming, t.backendSettings;
  }
  /** Ensure sticky pin % fields are marked so first paint matches settings (no open/close needed). */
  function normalizeLoadedPinCard(card) {
    if (!card || typeof card !== "object") return card;
    const hasPct = Number.isFinite(Number(card.overlay_x_pct)) || Number.isFinite(Number(card.overlay_y_pct));
    if (!hasPct && card.overlay_pin_unit !== "pct") return card;
    card.overlay_pin_unit = "pct";
    const origin = String(card.overlay_pin_origin || "");
    if (!origin || origin === "bottom-left") card.overlay_pin_origin = "bl";
    return card;
  }
  async function pe(e) {
    const writeGen = ++t.settingsWriteGen, sentActive = e?.card && "active_preset_id" in e.card ? String(e.card.active_preset_id || "") : "";
    sentActive && (t.activePresetId = sentActive);
    const n = await K("/v1/settings", {
      method: "PUT",
      body: e
    });
    // Only the latest write may replace memory; older responses must not rewind active_preset_id.
    if (writeGen === t.settingsWriteGen) {
      t.backendSettings = n?.settings || t.backendSettings;
      const prefer = String(t.activePresetId || sentActive || "");
      if (prefer && t.backendSettings?.card) {
        pinActivePreset(t.backendSettings.card, prefer);
        const active = (t.backendSettings.card.presets || []).find((p) => presetIdEq(p.id, prefer));
        active && (t.backendSettings.card.custom_pos = e?.card?.custom_pos ?? active.positive ?? "", t.backendSettings.card.custom_neg = e?.card?.custom_neg ?? active.negative ?? "");
      }
    }
    return n;
  }
  async function syncQuickSettingsButton(enabled) {
    if (enabled) {
      if (t.quickButtonRegistered || typeof k.registerButton != "function") return;
      const registered = await D("registerButton", () => k.registerButton({
        name: "Inlay Nexus",
        icon: "🖼️",
        iconType: "html",
        location: "action",
        id: "inlay-nexus-gui"
      }, At), null);
      registered !== null && (t.quickButtonRegistered = !0);
      return;
    }
    if (!t.quickButtonRegistered) return;
    if (typeof k.unregisterUIPart == "function") {
      await D("unregisterButton", () => k.unregisterUIPart("inlay-nexus-gui"), null);
      t.quickButtonRegistered = !1;
    }
  }
  function mergeSettingsPatch(e, n) {
    const o = { ...e || {} };
    for (const [a, r] of Object.entries(n || {})) o[a] = r && typeof r == "object" && !Array.isArray(r) ? mergeSettingsPatch(o[a] && typeof o[a] == "object" ? o[a] : {}, r) : r;
    return o;
  }
  async function flushSettingsSave() {
    t.settingsSaveTimer && (clearTimeout(t.settingsSaveTimer), t.settingsSaveTimer = null);
    if (t.settingsSaveInFlight) return t.settingsSaveInFlight;
    return t.settingsSaveInFlight = (async () => {
      while (t.settingsSavePending) {
        const e = t.settingsSavePending;
        t.settingsSavePending = null, await pe(e), e?.card && "show_risu_settings_button" in e.card && await syncQuickSettingsButton(e.card.show_risu_settings_button !== !1);
      }
    })().finally(() => {
      t.settingsSaveInFlight = null;
    }), t.settingsSaveInFlight;
  }
  function queueSettingsSave(e, opts = null) {
    // force: allow viewer (and other non-UI writers) to enqueue even when settings panel is closed.
    // Never strand a pending patch behind a !uiOpen timer abort — that reverts viewer preset changes.
    if (!e || t._uiRendering) return;
    if (!t.uiOpen && !opts?.force) return;
    t.settingsSavePending = mergeSettingsPatch(t.settingsSavePending, e), t.settingsSaveTimer && clearTimeout(t.settingsSaveTimer), t.settingsSaveTimer = setTimeout(() => {
      t.settingsSaveTimer = null;
      if (t._uiRendering) return;
      flushSettingsSave().then(() => {
        t.uiOpen && $e("자동 저장됨");
      }).catch((n) => {
        t.uiOpen && $e(`자동 저장 실패: ${z(n?.message || n, 60)}`, !1);
      });
    }, 500);
  }
  function syncCardPresetFormFromSettings() {
    if (typeof document > "u") return;
    const card = kt(t.backendSettings?.card || {}), activeId = resolveActivePresetId(card), active = (card.presets || []).find((p) => presetIdEq(p.id, activeId)) || null;
    pinActivePreset(card, activeId);
    const sel = document.getElementById("nx-preset-select");
    if (!sel && !document.querySelector("[data-preset-select]") && !document.getElementById("nx-custom-pos")) return;
    if (sel && activeId) {
      try {
        sel.value = activeId;
      } catch {
      }
      // Force selected attribute for hosts that ignore .value on re-show.
      try {
        Array.from(sel.options || []).forEach((opt) => {
          opt.selected = presetIdEq(opt.value, activeId);
        });
      } catch {
      }
    }
    document.querySelectorAll("[data-preset-select]").forEach((btn) => {
      btn.classList.toggle("active", presetIdEq(btn.getAttribute("data-preset-select"), activeId));
    });
    if (!active) return;
    const name = document.getElementById("nx-preset-name"), pos = document.getElementById("nx-custom-pos"), neg = document.getElementById("nx-custom-neg"), cfg = document.getElementById("nx-preset-cfg"), rescale = document.getElementById("nx-preset-rescale");
    if (name) name.value = active.name || "";
    if (pos) pos.value = active.positive || "";
    if (neg) neg.value = active.negative || "";
    if (cfg) cfg.value = active.cfg_scale == null || active.cfg_scale === "" ? "" : String(active.cfg_scale);
    if (rescale) rescale.value = active.cfg_rescale == null || active.cfg_rescale === "" ? "" : String(active.cfg_rescale);
    const st = document.getElementById("nx-preset-vibe-status"), prev = document.getElementById("nx-preset-vibe-preview");
    st && (st.textContent = active.vibe_configured ? "설정됨 · 이 프리셋 사용" : "없음 · NAI 모델설정 사용");
    prev && (prev.innerHTML = active.vibe_configured && active.vibe_preview_url ? `<img src="${h(active.vibe_preview_url)}" alt="vibe">` : '<span class="muted">없음 · 생성 시 NAI 모델설정 vibe 사용</span>');
  }
  async function Je() {
    const e = await K("/v1/prompts", { method: "GET" });
    t.prompts = e?.prompts || [];
    for (const n of t.prompts) t.promptDrafts[n.key] == null && (t.promptDrafts[n.key] = n.text || "");
    return t.prompts;
  }
  async function oa(e, n) {
    // During active generation, never wipe the selected message / gallery —
    // host chat-index flicker used to clear the strip mid-shot ("생성 중…만 보임").
    const busyHash = [...t.jobsInFlight.keys()][0] || "";
    const keepSelection = !!(busyHash || (t.jobProgress && formatViewerJob(t.jobProgress)?.busy));
    y("info", "session.change", `${(e || "").slice(-8) || "-"} → ${(n || "").slice(-8) || "-"} · ${keepSelection ? "keep selection (job busy)" : "clear selection"}`);
    if (!keepSelection) {
      t.selectedMessage = null, t.lastImagedMessage = null, t.lastOverlayFocusHash = "", t.gallery = [], t._galleryCache = null, t._msgElsCache = null;
    } else {
      t._galleryCache = null;
    }
    try {
      await Fe();
    } catch {
    }
    if (n) try {
      await ce(n, !0);
    } catch {
    }
    if (t.galleryUi?.renderGal) try {
      await t.galleryUi.renderGal();
    } catch {
    }
    t.debugUi?.refreshSoon && t.debugUi.refreshSoon();
  }
  async function Z(e = {}) {
    const n = e.useOverride !== !1 ? t.scopeOverride : null;
    let o = Number(await D("getCurrentCharacterIndex", () => k.getCurrentCharacterIndex?.(), -1)), a = Number(await D("getCurrentChatIndex", () => k.getCurrentChatIndex?.(), -1));
    const r = !n || n.charIndex == null || n.charIndex === "live", i = !n || n.chatIndex == null || n.chatIndex === "live", unified = !!(!i && n?.chatIndex === "unified");
    !r && Number.isFinite(Number(n.charIndex)) && Number(n.charIndex) >= 0 && (o = Number(n.charIndex)), unified || (!i && Number.isFinite(Number(n.chatIndex)) && Number(n.chatIndex) >= 0 ? a = Number(n.chatIndex) : r || (a = Number.isFinite(a) && a >= 0 ? a : 0));
    // Host APIs sometimes return -1 while NAI/IDB is busy. Do not treat that as a real session switch.
    if (r && (!Number.isFinite(o) || o < 0) && t.lastScope?.sessionId) {
      y("warn", "session.skip", `live charIndex=${o} · keep ${String(t.lastScope.sessionId).slice(-8)}`);
      return t.lastScope;
    }
    if (!unified && i && (!Number.isFinite(a) || a < 0) && t.lastScope?.sessionId) {
      y("warn", "session.skip", `live chatIndex=${a} · keep ${String(t.lastScope.sessionId).slice(-8)}`);
      return t.lastScope;
    }
    const s = o >= 0 ? await D("getCharacterFromIndex", () => k.getCharacterFromIndex?.(o), null) : await D("getCharacter", () => k.getCharacter?.(), null), c = !unified && o >= 0 && a >= 0 ? await D("getChatFromIndex", () => k.getChatFromIndex?.(o, a), null) : null, l = w(s?.chaId || s?.id || s?.name || `char_${o}`), p = unified ? "__unified__" : w(c?.id || c?.chatId || `chat_${a}`), m = w(s?.name || s?.charName || "", 200), u = unified ? "통합 챗" : w(c?.name || c?.chatName || c?.title || `Chat ${a}`, 200), b = `risu_${ye(`${l}|${p}`)}`, E = `risu_${ye(`${l}|__unified__`)}`, C = {
      charIndex: o,
      chatIndex: unified ? "unified" : a,
      characterId: l,
      chatId: p,
      sessionId: b,
      unifiedSessionId: E,
      character: s,
      chat: c,
      characterName: m,
      chatName: u,
      liveChar: r,
      liveChat: i && !unified,
      unified
    }, S = t.lastScope?.sessionId || "";
    if (S && S !== b) {
      if (t.pendingSessionId === b) t.pendingSessionCount += 1;
      else t.pendingSessionId = b, t.pendingSessionCount = 1;
      if (t.pendingSessionCount >= 2) return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, await oa(S, b), C;
      return C;
    }
    return t.pendingSessionId = "", t.pendingSessionCount = 0, t.lastScope = C, C;
  }

  async function ia() {
    const e = await D("getDatabase", () => k.getDatabase?.(["characters"]), null), n = Array.isArray(e?.characters) ? e.characters : [];
    return t.charCatalog = n.map((o, a) => {
      const r = Array.isArray(o?.chats) ? o.chats : [];
      return {
        index: a,
        name: w(o?.name || o?.charName || `Character ${a}`, 200) || `Character ${a}`,
        chaId: w(o?.chaId || o?.id || "", 200),
        chats: r.map((i, s) => ({
          index: s,
          name: w(i?.name || i?.chatName || i?.title || `Chat ${s}`, 200) || `Chat ${s}`,
          id: w(i?.id || i?.chatId || "", 200)
        }))
      };
    }), t.charCatalog;
  }
  function sa(e) {
    const n = t.charCatalog || [], o = t.scopeOverride, a = !o || o.charIndex == null || o.charIndex === "live", unified = !!(o && o.chatIndex === "unified"), r = !unified && (!o || o.chatIndex == null || o.chatIndex === "live"), i = Number(e?.charIndex ?? -1), s = Number(e?.chatIndex ?? -1), c = (!a ? n.find((l) => l.index === i) : null) || n.find((l) => l.index === i) || n[0];
    const unifiedFirst = !!(t.backendSettings?.card?.unified_chat_priority);
    const chatOpts = unifiedFirst ? [
      `<option value="unified"${unified ? " selected" : ""}>통합 챗</option>`,
      `<option value="live"${r ? " selected" : ""}>현재 챗</option>`
    ] : [
      `<option value="live"${r ? " selected" : ""}>현재 챗</option>`,
      `<option value="unified"${unified ? " selected" : ""}>통합 챗</option>`
    ];
    const l = [
      `<option value="live"${a ? " selected" : ""}>현재 캐릭터 챗</option>`,
      ...n.map((p) => `<option value="${p.index}" ${!a && p.index === i ? "selected" : ""}>${h(p.name)}</option>`)
    ].join(""), p = [
      ...chatOpts,
      ...(c?.chats || []).map((m) => `<option value="${m.index}" ${!unified && !r && m.index === s ? "selected" : ""}>${h(m.name)}</option>`)
    ].join("");
    return `
      <div class="scope-bar card" style="margin:0 0 14px;padding:12px 14px">
        <div class="prompt-group-label" style="margin:0 0 8px;border:0;padding:0">현재 작업 캐릭터 챗</div>
        <div class="model-form" style="margin:0">
          <label><span>캐릭터</span><select id="nx-scope-char">${l}</select></label>
          <label><span>채팅</span><select id="nx-scope-chat">${p}</select></label>
        </div>
        <div class="muted" style="margin-top:8px;font-size:12px">${unified ? "통합 챗: 이 캐릭터의 모든 채팅 캐릭터를 별칭 겹침 기준으로 묶은 공용 로스터입니다." : "설정/캐릭터 탭에서 다루는 세션입니다. 자동 생성(afterRequest)은 Risu 실제 현재 채팅을 따릅니다."}</div>
      </div>`;
  }

  function yt(e) {
    return w(e?.data ?? e?.content ?? e?.message ?? e?.text ?? "");
  }
  function Xe(e, n, o) {
    const a = Array.isArray(e?.message) ? e.message : [], r = [];
    for (let i = a.length - 1; i >= 0 && r.length < Math.max(1, n + 1); i -= 1) {
      const s = a[i], VC = globalThis.__INLAY_VIEWER_CORE__, c = typeof VC?.rawMessageRole == "function" ? VC.rawMessageRole(s) : w(s?.role || s?.type || "").toLowerCase(), l = c === "char" || c === "assistant" || c === "bot", p = c === "user";
      !l && !(o && p) || r.unshift({
        role: p ? "user" : "char",
        content: yt(s)
      });
    }
    return r;
  }
  function isCharacterImageExtraLore(e) {
    return String(e?.comment || e?.name || "").trim().toLowerCase() === "lb-xnai.lb.extra";
  }
  async function la() {
    const e = await D("getCurrentLorebookEntries", () => k.getCurrentLorebookEntries?.(), []);
    return Array.isArray(e) ? e.slice(0, 500).map((n) => {
      const o = n?.key ?? n?.keys ?? "", a = Array.isArray(o) ? o.map((r) => w(r, 200)).filter(Boolean).join(", ") : w(o, 2e3);
      const comment = w(n?.comment || n?.name || "", 200);
      const extra = String(comment).trim().toLowerCase() === "lb-xnai.lb.extra";
      return {
        comment,
        content: w(n?.content || n?.data || "", extra ? 5e4 : 8e3),
        key: a,
        secondkey: w(n?.secondkey || n?.secondKey || "", 400),
        alwaysActive: !!(n?.alwaysActive || n?.constant),
        mode: w(n?.mode || "", 40)
      };
    }).filter((n) => n.content && n.mode !== "folder" && !String(n.key || "").startsWith("folder:")) : [];
  }
  function filledNamesFromUiRoster() {
    const out = [], seen = /* @__PURE__ */ new Set();
    const pushToken = (raw) => {
      const text = w(raw, 200);
      const key = text.toLowerCase().replace(/[^a-z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]+/gi, "");
      if (!text || !key || seen.has(key)) return;
      seen.add(key);
      out.push(text);
    };
    for (const c of [...(t.charactersSession || []), ...(t.charactersGlobal || [])]) {
      if (!w(c?.appearance || "", 4000)) continue;
      pushToken(c?.name);
      const aliases = Array.isArray(c?.aliases) ? c.aliases : String(c?.aliases || "").split(/[,/\n]/);
      for (const a of aliases) pushToken(a);
    }
    return out;
  }
  function trimExtraLoreForMessage(entries, message, triggerKeys, filledNames = []) {
    const LE = globalThis.__INLAY_LORE_EXTRA__;
    const keys = Array.isArray(triggerKeys) ? triggerKeys : collectTriggeredLoreKeys(entries, message);
    const filled = Array.isArray(filledNames) ? filledNames : [];
    const out = [];
    for (const s of entries || []) {
      if (!isCharacterImageExtraLore(s) || !s?.content) continue;
      const raw = w(s.content, 5e4);
      let keepNames = [];
      if (typeof LE?.matchCharacterImageSectionTitles == "function") {
        keepNames = LE.matchCharacterImageSectionTitles(raw, message, keys) || [];
      }
      let trimmed = "";
      if (typeof LE?.trimCharacterImageTagLore == "function") {
        trimmed = LE.trimCharacterImageTagLore(raw, filled, keepNames) || "";
      }
      // Never ship the raw multi-character file. No keep → omit entirely.
      if (!trimmed || !keepNames.length) continue;
      out.push({
        ...s,
        content: trimmed,
        key: keepNames.join(", "),
        always: !0
      });
    }
    return out;
  }
  function normalizeLoreExtraMode(value) {
    if (value === !1 || value === "false" || value === "off" || value === "none") return "off";
    if (value === "full") return "full";
    return "tags";
  }
  function fullExtraLoreEntries(entries) {
    const out = [];
    for (const s of entries || []) {
      if (!isCharacterImageExtraLore(s) || !s?.content) continue;
      out.push({
        ...s,
        content: w(s.content, 5e4),
        key: "full",
        always: !0
      });
    }
    return out;
  }
  function ca(e, n, o = 5, loreExtraMode = "tags") {
    const mode = normalizeLoreExtraMode(loreExtraMode);
    const triggerKeys = collectTriggeredLoreKeys(e, n);
    const extras = mode === "off" ? [] : mode === "full" ? fullExtraLoreEntries(e) : trimExtraLoreForMessage(e, n, triggerKeys, filledNamesFromUiRoster());
    const a = w(n || "").toLowerCase(), r = a.replace(/\s+/g, "");
    if (!a) return extras;
    const countOcc = (hay, needle) => {
      if (!hay || !needle || needle.length < 2) return 0;
      let hits = 0, from = 0;
      while (from <= hay.length - needle.length) {
        const at = hay.indexOf(needle, from);
        if (at < 0) break;
        hits += 1, from = at + needle.length;
      }
      return hits;
    };
    const scored = [];
    for (const s of e || []) {
      if (!s?.content || isCharacterImageExtraLore(s) || s.mode === "folder" || String(s.key || "").startsWith("folder:")) continue;
      const c = String(s.key || "").split(/[,|\n]/).map((l) => l.trim()).filter(Boolean);
      if (s.secondkey) String(s.secondkey).split(/[,|\n]/).forEach((l) => {
        const p = l.trim();
        p && c.push(p);
      });
      if (!c.length) continue;
      let hits = 0;
      for (const l of c) {
        const p = l.toLowerCase(), m = p.replace(/\s+/g, "");
        if (m.length < 2) continue;
        hits += Math.max(countOcc(a, p), countOcc(r, m));
      }
      if (hits <= 0) continue;
      scored.push({
        ...s,
        content: w(s.content, 1200),
        hits
      });
    }
    scored.sort((x, y) => y.hits - x.hits || String(x.comment || "").localeCompare(String(y.comment || "")));
    return [...extras, ...scored.slice(0, Math.max(1, o)).map(({ hits, ...rest }) => rest)];
  }
  /** All trigger keys from EVERY lore entry that hits (not limited to top-5 content pack). */
  function collectTriggeredLoreKeys(entries, message) {
    const a = w(message || "").toLowerCase(), r = a.replace(/\s+/g, "");
    if (!a) return [];
    const countOcc = (hay, needle) => {
      if (!hay || !needle || needle.length < 2) return 0;
      let hits = 0, from = 0;
      while (from <= hay.length - needle.length) {
        const at = hay.indexOf(needle, from);
        if (at < 0) break;
        hits += 1, from = at + needle.length;
      }
      return hits;
    };
    const out = [], seen = /* @__PURE__ */ new Set();
    for (const s of entries || []) {
      if (!s || isCharacterImageExtraLore(s) || s.mode === "folder" || String(s.key || "").startsWith("folder:")) continue;
      const c = String(s.key || "").split(/[,|\n]/).map((l) => l.trim()).filter(Boolean);
      if (s.secondkey) String(s.secondkey).split(/[,|\n]/).forEach((l) => {
        const p = l.trim();
        p && c.push(p);
      });
      if (!c.length) continue;
      let hits = 0;
      for (const l of c) {
        const p = l.toLowerCase(), m = p.replace(/\s+/g, "");
        if (m.length < 2) continue;
        hits += Math.max(countOcc(a, p), countOcc(r, m));
      }
      if (hits <= 0) continue;
      for (const l of c) {
        const k = l.toLowerCase().replace(/\s+/g, "");
        if (k.length < 2 || seen.has(k)) continue;
        seen.add(k), out.push(l);
      }
    }
    return out;
  }
  function da(e) {
    const n = Array.isArray(e?.message) ? e.message : [];
    for (let o = n.length - 1; o >= 0; o -= 1) {
      const a = w(n[o]?.role || n[o]?.type || "").toLowerCase();
      if (a === "char" || a === "assistant" || a === "bot") return o;
    }
    return -1;
  }
  async function pa(e, n, o) {
    if (!e) return {
      ok: !1,
      unlinked: 0
    };
    try {
      const a = await K("/v1/gallery/unlink", {
        method: "POST",
        body: {
          session_id: e,
          content_hash: n || "",
          message_index: o
        }
      }, 15e3);
      return y("info", "gallery.unlink", `n=${a?.unlinked || 0} hash=${String(n || "").slice(0, 8)}`), a || {
        ok: !0,
        unlinked: 0
      };
    } catch (a) {
      return y("warn", "gallery.unlink.fail", a?.message || a), {
        ok: !1,
        unlinked: 0,
        error: a?.message || String(a)
      };
    }
  }
  async function flushDirtyCharacters(sessionId = "") {
    if (!t._charsDirty) return null;
    const scope = await Z().catch(() => null);
    const sid = w(sessionId || scope?.sessionId || t.lastScope?.sessionId || "", 200) || "";
    const hasDom = !!document.querySelector('[data-char-scope="session"], [data-char-scope="global"]');
    const body = withRootSessions({
      session_id: sid,
      character_id: w(scope?.characterId || t.lastScope?.characterId || "", 200),
      characters: hasDom ? oe("session") : t.charactersSession || [],
      global: hasDom ? oe("global") : t.charactersGlobal || []
    }, scope || t.lastScope);
    const res = await K("/v1/characters", {
      method: "POST",
      body
    }, 2e4);
    if (Array.isArray(res?.characters)) t.charactersSession = res.characters;
    if (Array.isArray(res?.global)) t.charactersGlobal = res.global;
    if (res?.appearance) t.appearance = res.appearance;
    t._charsDirty = !1;
    return res;
  }
  async function Be(e, n, o = !1) {
    const a = (t.backendSettings || await le())?.card || {};
    if (!o && a.power === !1)
      return y("warn", "job.skip", "power off"), null;
    // Persist cleared/edited appearance before LLM sees the roster.
    try {
      await flushDirtyCharacters(e.sessionId);
    } catch (err) {
      y("warn", "chars.flush", err?.message || err);
    }
    const loreExtraMode = normalizeLoreExtraMode(a.lore_extra), r = re(a.include_max, 0, 20, 0), i = a.lorebook ? await la() : [], s = a.lorebook ? ca(i, n, 5, loreExtraMode) : [], loreTriggerKeys = a.lorebook ? collectTriggeredLoreKeys(i, n) : [], c = e.character || {};
    y("info", "job.lore", `raw=${i.length} matched=${s.length} triggerKeys=${loreTriggerKeys.length} lore_extra=${loreExtraMode}`);
    const l = t.selectedMessage, m = ye(n), selectedMatches = !!(l?.hash && l.hash === m), p = selectedMatches && l?.chatIndex != null && Number(l.chatIndex) >= 0 ? Number(l.chatIndex) : da(e.chat);
    // Same-message work already running → defend (no interrupt), force or not.
    if (t.jobsInFlight.has(m) || (t.jobProgress && formatViewerJob(t.jobProgress)?.busy && t.selectedMessage?.hash === m)) {
      y("info", "job.busy", `same message in flight ${m.slice(0, 8)}`);
      try {
        if (t.galleryUi?.status?.setTextContent) await t.galleryUi.status.setTextContent("이미 작업 중… 끝날 때까지 기다려 주세요");
      } catch {
      }
      return null;
    }
    // Claim lock before unlink/create so duplicate clicks cannot race.
    t.jobsInFlight.set(m, Date.now()), t._lastShotDone = -1;
    if (!o) {
      try {
        await ce(e.sessionId);
      } catch {
      }
      // Exact hash first; streaming-complete text may need one-shot hash rebind.
      let b = ge(m, n);
      if (!b.length && !o) {
        try {
          b = await maybeRebindAndLink({
            hash: m,
            text: n,
            characterId: e.characterId,
            chatId: e.chatId,
            sessionId: e.sessionId,
            chatIndex: p,
            messageIndex: p,
            role: w(t.selectedMessage?.role || "char", 40)
          }, e);
        } catch {
        }
      }
      if (b.length)
        return t.jobsInFlight.delete(m), y("info", "job.skip", `cache hit hash=${m.slice(0, 8)} cards=${b.length}`), null;
      y("info", "job.noHash", `hash=${m.slice(0, 8)} · no cards → tag+generate`);
    }
    if (o) {
      await pa(e.sessionId, m, p);
      try {
        await ce(e.sessionId);
      } catch {
      }
      t.selectedMessage && t.selectedMessage.hash === m && (t.selectedMessage.hasImage = !1, t.selectedMessage.cardCount = 0, t.selectedMessage.paragraphsWithImages = [], t.selectedMessage.matchMode = "none");
      try {
        await he();
      } catch {
      }
      if (t.galleryUi?.renderGal) try {
        await t.galleryUi.renderGal();
      } catch {
      }
    }
    const u = {
      session_id: e.sessionId,
      character_id: e.characterId,
      character_name: w(e.characterName || c?.name || "", 200),
      chat_id: e.chatId,
      chat_name: w(e.chatName || "", 200),
      unified_session_id: e.unifiedSessionId || `risu_${ye(`${e.characterId || ""}|__unified__`)}`,
      source_session_ids: rootChatSessionIds(e),
      char_index: Number(e.charIndex ?? -1),
      chat_index: e.chatIndex === "unified" ? -1 : Number(e.chatIndex ?? -1),
      assistant_text: n,
      message_index: p,
      message_role: w(t.selectedMessage?.role || "char", 40),
      content_hash: m,
      recent_messages: Xe(e.chat, r, !!a.userchat),
      lorebook: s,
      lore_trigger_keys: loreTriggerKeys,
      character_description: w(c?.description || c?.desc || "", 12e3),
      persona_description: w(c?.personality || "", 8e3),
      force: o
    };
    y("info", "job.create", `hash=${m.slice(0, 8)} msg#${p} chars=${n.length} force=${!!o}`);
    try {
      const b = await K("/v1/jobs/create", {
        method: "POST",
        body: u
      }, 3e4);
      if (b?.busy || b?.error?.code === "busy") {
        t.jobsInFlight.delete(m);
        y("info", "job.busy", b?.error?.message || "busy");
        try {
          if (t.galleryUi?.status?.setTextContent) await t.galleryUi.status.setTextContent(b?.error?.message || "이미 작업 중… 끝날 때까지 기다려 주세요");
        } catch {
        }
        return null;
      }
      return t.activeJobId = b?.job_id || "", t.lastJobState = "queued", t.jobProgress = {
        state: "queued",
        message: "대기열…",
        progress: 0,
        shot_index: 0,
        shot_count: 0,
        shot_done: 0,
        jobId: b?.job_id || ""
      }, await Se(), y("info", "job.queued", b?.job_id || "(no id)"), t.galleryUi?.renderGal && await t.galleryUi.renderGal(), ua(e.sessionId, b?.job_id, m), b;
    } catch (b) {
      throw t.jobsInFlight.delete(m), t.lastJobState = "error", y("error", "job.create.fail", b?.message || b), b;
    }
  }
  function ua(e, n, o = "") {
    n && (t.pollTimer && clearInterval(t.pollTimer), t.pollTimer = setInterval(async () => {
      try {
        const a = await K(`/v1/jobs/${n}`, { method: "GET" }, 15e3);
        if (!a?.ok) return;
        const r = a.progress || {};
        t.jobProgress = {
          state: a.state || "",
          message: r.message || (a.state === "tagging" ? "장면 태깅 중…" : a.state === "generating" ? "이미지 생성 중…" : a.state === "queued" ? "대기열…" : a.state || ""),
          progress: Number(r.progress ?? (a.state === "done" ? 100 : 0)),
          shot_index: Number(r.shot_index ?? 0),
          shot_count: Number(r.shot_count ?? 0),
          shot_done: Number(r.shot_done ?? 0),
          jobId: n
        }, await Se();
        if (t.uiOpen) {
          if (a.state === "done" || a.state === "cancelled") {
            clearInterval(t.pollTimer), t.pollTimer = null, o && t.jobsInFlight.delete(o), y("info", a.state === "cancelled" ? "job.cancelled" : "job.done", n), t.jobProgress = {
              ...t.jobProgress,
              state: a.state === "cancelled" ? "cancelled" : "done",
              progress: a.state === "cancelled" ? Number(r.progress || 0) : 100,
              message: r.message || (a.state === "cancelled" ? "이전 작업 중단" : "생성 완료")
            }, await Se(), setTimeout(() => {
              t.jobProgress = null, Se().catch(() => {
              });
            }, a.state === "cancelled" ? 600 : 1800);
          } else a.state === "error" && (clearInterval(t.pollTimer), t.pollTimer = null, o && t.jobsInFlight.delete(o), t.uiMessage = {
            type: "error",
            text: z(a.error || "job failed", 400)
          }, t.jobProgress = {
            state: "error",
            progress: 0,
            message: z(a.error || "실패", 120),
            jobId: n
          }, await Se());
          return;
        }
        const i = Number(r.shot_done ?? 0), s = !!(a.state && a.state !== t.lastJobState), c = i !== Number(t._lastShotDone ?? -1);
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        if (s && (t.lastJobState = a.state, y("info", "job.poll", `${n.slice(0, 8)}… → ${a.state}`)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), r.message && r.message !== t._lastJobMsg && (t._lastJobMsg = r.message, y("info", "job.progress", r.message)), (a.state === "generating" || a.state === "done") && (c || s && (a.state === "generating" || a.state === "done"))) {
          t._lastShotDone = i;
          const prevIds = (t.gallery || []).map((card) => String(card?.id || ""));
          try {
            if (await ce(e), t.selectedMessage) {
              const l = linkedCards(t.selectedMessage);
              t.selectedMessage.hasImage = l.length > 0, t.selectedMessage.cardCount = l.length, t.selectedMessage.paragraphsWithImages = [...new Set(l.map((p) => p.paragraph))].sort((p, m) => Number(p) - Number(m)), t.selectedMessage.matchMode = l.length ? (l.some((p) => p.content_hash && p.content_hash === t.selectedMessage.hash) ? "hash" : "prefix") : "none";
            }
          } catch {
          }
          const nextIds = (t.gallery || []).map((card) => String(card?.id || ""));
          const idsChanged = VC?.shouldRefreshGallery ? VC.shouldRefreshGallery(prevIds, nextIds) : prevIds.join("|") !== nextIds.join("|");
          if (idsChanged) {
            if (c) scheduleOverlayPlace(120);
            await onSelectionChanged("content");
          } else if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
        } else if (s || a.state === "generating" || a.state === "tagging" || a.state === "queued") {
          if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
          else await onSelectionChanged("chrome");
        }
        if (a.state === "done" || a.state === "cancelled") {
          clearInterval(t.pollTimer), t.pollTimer = null, o && t.jobsInFlight.delete(o), y("info", a.state === "cancelled" ? "job.cancelled" : "job.done", n), t.jobProgress = {
            ...t.jobProgress,
            state: a.state === "cancelled" ? "cancelled" : "done",
            progress: a.state === "cancelled" ? Number(r.progress || 0) : 100,
            message: r.message || (a.state === "cancelled" ? "이전 작업 중단 · 새 요청 진행" : "생성 완료")
          }, await Se(), setTimeout(() => {
            t.jobProgress = null, Se().catch(() => {
            });
          }, a.state === "cancelled" ? 600 : 1800), y("info", "gallery.refresh", `${(t.gallery || []).length} cards`), await it();
          scheduleOverlayPlace(80);
          await onSelectionChanged("full");
        } else a.state === "error" && (clearInterval(t.pollTimer), t.pollTimer = null, o && t.jobsInFlight.delete(o), t.uiMessage = {
          type: "error",
          text: z(a.error || "job failed", 400)
        }, t.jobProgress = {
          state: "error",
          progress: 0,
          message: z(a.error || "실패", 120),
          jobId: n
        }, await Se(), y("error", "job.error", a.error || "failed"), await onSelectionChanged("chrome"));
      } catch (a) {
        Pe("poll", a);
      }
    }, 1e3));
  }
  async function ce(e, force = !1) {
    const n = e || t.lastScope?.sessionId;
    if (!n) return [];
    if (!force && t._galleryCache?.sessionId === n && Date.now() - Number(t._galleryCache.at || 0) < 2200 && Array.isArray(t.gallery)) return t.gallery;
    const prevGallery = Array.isArray(t.gallery) ? t.gallery : [];
    let o;
    try {
      o = await K(`/v1/gallery?session_id=${encodeURIComponent(n)}&limit=120`, { method: "GET" });
    } catch (err) {
      y("warn", "gallery.load.fail", err?.message || err);
      // Keep previous strip during job/IDB contention — empty overwrite looked like "연결 끊김".
      return prevGallery;
    }
    const nextItems = Array.isArray(o?.items) ? o.items : null;
    if (!nextItems) {
      y("warn", "gallery.load.empty", `session=${String(n).slice(-8)} · keep ${prevGallery.length}`);
      return prevGallery;
    }
    // Unexpected empty while we still have cards + a busy job → keep previous.
    if (!nextItems.length && prevGallery.length && (t.jobsInFlight.size || t.jobProgress)) {
      y("warn", "gallery.load.preserve", `busy + empty response · keep ${prevGallery.length}`);
      return prevGallery;
    }
    t.gallery = nextItems;
    t._galleryCache = { sessionId: n, at: Date.now() };
    try {
      const VC = globalThis.__INLAY_VIEWER_CORE__, N = globalThis.__INLAY_NATIVE__;
      if (typeof VC?.rebindGalleryMessageIndexes == "function") {
        try {
          const scope = await Za();
          const rebound = VC.rebindGalleryMessageIndexes(t.gallery, scope?.messages || [], ye);
          t.gallery = rebound.cards;
          if (rebound.changed) y("info", "gallery.rebind", `updated ${rebound.changed} card index(es)`);
        } catch {
        }
      }
      const focus = typeof VC?.galleryFocusMessage == "function" ? VC.galleryFocusMessage(t.selectedMessage, t.lastImagedMessage, t.gallery) : t.selectedMessage;
      const ordered = typeof VC?.galleryForMessage == "function" ? VC.galleryForMessage(t.gallery, focus, 8) : (t.gallery || []).slice(0, 8);
      const idx = Number(t.galleryUi?.index) || 0;
      const ids = VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(ordered, idx, 1, Math.max(8, ordered.length || 0)) : ordered.map((c) => c?.id).filter(Boolean);
      if (typeof N?.warmImages == "function") N.warmImages(ids).catch(() => {
      });
    } catch {
    }
    try {
      const charId = w(t.lastScope?.characterId || "", 200), a = await K(`/v1/characters?session_id=${encodeURIComponent(n)}${charId ? `&character_id=${encodeURIComponent(charId)}` : ""}`, { method: "GET" });
      t.appearance = a?.appearance || {}, t.charactersSession = a?.characters || [], t.charactersGlobal = a?.global || [], t.disabledGlobals = Array.isArray(a?.disabled_globals) ? a.disabled_globals : [];
    } catch {
      try {
        const r = await K(`/v1/appearance/${encodeURIComponent(n)}`, { method: "GET" });
        t.appearance = r?.appearance || {}, t.charactersSession = r?.characters || [], t.charactersGlobal = r?.global || [];
      } catch {
      }
    }
    return t.gallery;
  }
  function globalCharKey(e) {
    return w(e?.id || e?.name || "", 200);
  }
  function isGlobalEnabledForCharacter(e) {
    const n = t.disabledGlobals || [], o = globalCharKey(e), a = w(e?.name || "", 200);
    if (n.some((r) => r === o || r === a || String(r).toLowerCase() === a.toLowerCase())) return !1;
    return e && typeof e.enabled_for_character == "boolean" ? e.enabled_for_character : !0;
  }
  function enabledGlobalsForCharacter() {
    return (t.charactersGlobal || []).filter((e) => isGlobalEnabledForCharacter(e));
  }
  async function saveGlobalToggles() {
    const e = await Z().catch(() => null), n = w(e?.characterId || t.lastScope?.characterId || "", 200);
    if (!n) throw new Error("캐릭터 없음");
    const o = await K("/v1/characters/global-toggles", {
      method: "POST",
      body: {
        character_id: n,
        disabled_globals: Array.isArray(t.disabledGlobals) ? t.disabledGlobals : []
      }
    }, 12e3);
    return t.disabledGlobals = Array.isArray(o?.disabled_globals) ? o.disabled_globals : t.disabledGlobals, o;
  }
  function oe(e) {
    return [...document.querySelectorAll(`[data-char-scope="${e}"]`)].map((n, o) => {
      const a = n.getAttribute("data-char-id") || "", r = n.querySelector("[data-char-name]")?.value || "", i = n.querySelector("[data-char-original]")?.value || "", s = n.querySelector("[data-char-aliases]")?.value || "", c = n.querySelector("[data-char-appearance]")?.value || "", l = n.querySelector("[data-char-attire]")?.value || "", acc = n.querySelector("[data-char-accessories]")?.value || "", p = (q) => String(n.querySelector(q)?.value || "").split(/[,/\n]/).map((B) => B.trim()).filter(Boolean);
      return {
        id: a || `tmp_${e}_${o}`,
        name: String(r).trim(),
        original: String(i).trim(),
        aliases: String(s).split(/[,/\n]/).map((B) => B.trim()).filter(Boolean),
        surname: String(n.querySelector("[data-char-surname]")?.value || "").trim(),
        given_name: String(n.querySelector("[data-char-given]")?.value || "").trim(),
        surname_variants: p("[data-char-surname-variants]"),
        given_name_variants: p("[data-char-given-variants]"),
        appearance: String(c).trim(),
        attire: String(l).trim(),
        accessories: String(acc).trim(),
        attire_locked: n.querySelector("[data-char-attire-locked]") ? !!n.querySelector("[data-char-attire-locked]")?.checked : true,
        accessories_locked: n.querySelector("[data-char-accessories-locked]") ? !!n.querySelector("[data-char-accessories-locked]")?.checked : true,
        priority: Number(n.querySelector("[data-char-priority]")?.value || 0),
        gender: ["girl", "boy", "other"].includes(String(n.querySelector("[data-char-gender]")?.value || "")) ? String(n.querySelector("[data-char-gender]")?.value || "") : ""
      };
    }).filter((n) => n.name);
  }
  function charExportKey(e) {
    return String(e?.id || e?.name || "").trim().toLowerCase();
  }
  function mergeCharacterLists(existing, incoming) {
    const out = Array.isArray(existing) ? existing.map((e) => ({
      ...e
    })) : [];
    for (const raw of incoming || []) {
      if (!raw || typeof raw != "object") continue;
      const name = String(raw.name || "").trim();
      if (!name) continue;
      const key = charExportKey(raw), nameKey = name.toLowerCase();
      const idx = out.findIndex((e) => charExportKey(e) === key || String(e?.name || "").trim().toLowerCase() === nameKey);
      const next = {
        id: String(raw.id || "").trim() || (idx >= 0 ? out[idx].id : name),
        name,
        original: String(raw.original || "").trim(),
        aliases: Array.isArray(raw.aliases) ? raw.aliases : String(raw.aliases || "").split(/[,/\n]/).map((B) => B.trim()).filter(Boolean),
        surname: String(raw.surname || "").trim(),
        given_name: String(raw.given_name || "").trim(),
        surname_variants: Array.isArray(raw.surname_variants) ? raw.surname_variants : String(raw.surname_variants || "").split(/[,/\n]/).map((B) => B.trim()).filter(Boolean),
        given_name_variants: Array.isArray(raw.given_name_variants) ? raw.given_name_variants : String(raw.given_name_variants || "").split(/[,/\n]/).map((B) => B.trim()).filter(Boolean),
        appearance: String(raw.appearance || "").trim(),
        attire: String(raw.attire || "").trim(),
        accessories: String(raw.accessories || "").trim(),
        attire_locked: raw.attire_locked !== false,
        accessories_locked: raw.accessories_locked !== false,
        priority: Number(raw.priority || 0) || 0,
        gender: ["girl", "boy", "other", "female", "male"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? (["female", "f", "woman"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? "girl" : ["male", "m", "man"].includes(String(raw.gender || raw.sex || "").toLowerCase()) ? "boy" : String(raw.gender || raw.sex || "").toLowerCase()) : ""
      };
      if (idx >= 0) out[idx] = {
        ...out[idx],
        ...next,
        id: out[idx].id || next.id
      };
      else out.push(next);
    }
    return out;
  }
  function parseCharactersImportJson(text, preferScope) {
    const parsed = JSON.parse(String(text || ""));
    if (Array.isArray(parsed)) {
      return {
        session: preferScope === "session" ? parsed : null,
        global: preferScope === "global" ? parsed : null
      };
    }
    if (!parsed || typeof parsed != "object") throw new Error("JSON 객체가 아닙니다");
    const session = Array.isArray(parsed.session) ? parsed.session : Array.isArray(parsed.characters) && (parsed.scope === "session" || preferScope === "session" && parsed.scope !== "global") ? parsed.characters : null;
    const global = Array.isArray(parsed.global) ? parsed.global : Array.isArray(parsed.characters) && (parsed.scope === "global" || preferScope === "global" && parsed.scope !== "session") ? parsed.characters : null;
    if (!session && !global && Array.isArray(parsed.characters)) {
      return preferScope === "global" ? {
        session: null,
        global: parsed.characters
      } : {
        session: parsed.characters,
        global: null
      };
    }
    if (!session && !global) throw new Error("characters / session / global 배열이 없습니다");
    return {
      session,
      global
    };
  }
  function downloadCharactersJson(filename, payload) {
    const n = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    }), o = URL.createObjectURL(n), a = document.createElement("a");
    a.href = o, a.download = filename, document.body.appendChild(a), a.click(), a.remove(), setTimeout(() => URL.revokeObjectURL(o), 1e3);
  }
  async function exportCharactersScope(scope) {
    const list = oe(scope);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCharactersJson(`inlay-${scope}-characters-${stamp}.json`, {
      format: "inlay-nexus-characters",
      version: 1,
      scope,
      exported_at: new Date().toISOString(),
      characters: list,
      ...(scope === "session" ? {
        session: list
      } : {
        global: list
      })
    });
    return list.length;
  }
  async function importCharactersFromFile(file, preferScope) {
    const parsed = parseCharactersImportJson(await file.text(), preferScope);
    const scope = await Z().catch(() => null);
    const body = {
      session_id: scope?.sessionId || "",
      character_id: scope?.characterId || ""
    };
    let sessionCount = 0, globalCount = 0;
    if (Array.isArray(parsed.session)) {
      const merged = mergeCharacterLists(oe("session"), parsed.session);
      body.characters = merged, sessionCount = merged.length;
    }
    if (Array.isArray(parsed.global)) {
      const merged = mergeCharacterLists(oe("global"), parsed.global);
      body.global = merged, globalCount = merged.length;
    }
    if (!("characters" in body) && !("global" in body)) throw new Error("가져올 캐릭터가 없습니다");
    const res = await K("/v1/characters", {
      method: "POST",
      body
    }, 2e4);
    if (Array.isArray(res?.characters)) t.charactersSession = res.characters;
    else if (body.characters) t.charactersSession = body.characters;
    if (Array.isArray(res?.global)) t.charactersGlobal = res.global;
    else if (body.global) t.charactersGlobal = body.global;
    if (res?.appearance) t.appearance = res.appearance;
    t._charsDirty = !1;
    return {
      sessionCount,
      globalCount
    };
  }
  function wt(e, n, o) {
    const a = Array.isArray(e) ? e : [];
    return a.length ? a.map((r) => {
      const i = Array.isArray(r.aliases) ? r.aliases.join(", ") : String(r.aliases || ""), s = String(r.id || r.name || ""), c = h(s), l = t.autotagFocus && String(t.autotagFocus.scope || "") === String(n) && String(t.autotagFocus.id || "") === s, p = n === "global" ? isGlobalEnabledForCharacter(r) : !0;
      const appEmpty = !String(r.appearance || "").trim();
      const globalHit = n === "session" && appEmpty
        ? (t.charactersGlobal || []).find((g) => String(g?.name || "").trim().toLowerCase() === String(r.name || "").trim().toLowerCase() && String(g?.appearance || "").trim())
        : null;
      const globalHint = globalHit
        ? `<div class="notice info" style="margin:8px 0 0;font-size:12px">채팅 외형은 비어 있지만 같은 이름 <strong>글로벌</strong> 외형이 적용됩니다(옷만 이 채팅에 덮어쓴 상태). 비우거나 다시 뽑게 하려면 글로벌 외형을 지우세요.</div>`
        : appEmpty
          ? `<div class="muted" style="margin:8px 0 0;font-size:12px">외형 비어 있음 → 생성 시 미완성으로 보내 new_characters 수집</div>`
          : "";
      return `
        <details class="card char-card${l ? " autotag-armed" : ""}${n === "global" && !p ? " global-off" : ""}" data-char-scope="${h(n)}" data-char-id="${c}"${l ? " open" : ""} style="${n === "global" && !p ? "opacity:.62" : ""}">
          <summary style="cursor:pointer;font-weight:700;display:flex;align-items:center;gap:8px;list-style:none;flex-wrap:wrap">
            <span style="flex:1;min-width:120px">${h(r.name || "(이름 없음)")}${r.original ? ` · <span class="muted" style="font-weight:500">${h(r.original)}</span>` : ""}${appEmpty ? ' · <span class="muted" style="font-weight:500;color:#fbbf24">외형 없음</span>' : ""}</span>
            <span class="autotag-badge${l ? " show" : ""}" data-autotag-badge>${l ? "선택됨 · Ctrl+V" : ""}</span>
            ${n === "global" ? `<label class="char-lock" data-global-toggle-wrap title="이 캐릭터 챗에서 사용" style="display:inline-flex;align-items:center;gap:4px;margin:0;flex-shrink:0;white-space:nowrap;cursor:pointer"><input data-global-toggle="${c}" type="checkbox" ${p ? "checked" : ""}><span>사용</span></label>` : ""}
            <button type="button" class="secondary${l ? " armed" : ""}" data-char-autotag title="클릭: 붙여넣기 대상 선택 · 더블클릭: 파일 선택">${l ? "붙여넣기 대기" : "오토태그"}</button>
            ${n === "session" ? '<button type="button" class="secondary" data-char-to-global style="min-height:30px;padding:4px 10px;flex-shrink:0">글로벌</button>' : ""}
            <button type="button" class="secondary" data-char-delete style="min-height:30px;padding:4px 10px;flex-shrink:0">삭제</button>
          </summary>
          ${globalHint}
          <div class="model-form" style="margin-top:12px">
            <label><span>이름</span><input data-char-name value="${h(r.name || "")}"></label>
            <label><span>원본 태그</span><input data-char-original value="${h(r.original || "")}" placeholder="(원작 캐릭터 태그)"></label>
            <div class="char-name-grid wide">
              <span class="char-name-corner"></span><span class="char-name-col">기본</span><span class="char-name-col">한·영</span>
              <span class="char-name-row">성</span>
              <input data-char-surname value="${h(r.surname || "")}" placeholder="한">
              <input data-char-surname-variants value="${h(Array.isArray(r.surname_variants) ? r.surname_variants.join(", ") : r.surname_variants || "")}" placeholder="Han, HAN">
              <span class="char-name-row">이름</span>
              <input data-char-given value="${h(r.given_name || "")}" placeholder="진우">
              <input data-char-given-variants value="${h(Array.isArray(r.given_name_variants) ? r.given_name_variants.join(", ") : r.given_name_variants || "")}" placeholder="Jinwoo, JINWOO">
            </div>
            <label class="wide"><span>트리거/별칭</span><input data-char-aliases value="${h(i)}" placeholder="한진우, HAN JINWOO, 진우"></label>
            <label class="wide"><span>외형 태그 (옷·무기 제외)</span><textarea data-char-appearance rows="3">${h(r.appearance || "")}</textarea></label>
            <div class="char-wear-grid wide">
              <div class="char-wear-col">
                <div class="char-wear-head"><span>옷·악세사리</span><label class="char-lock"><input data-char-attire-locked type="checkbox" ${r.attire_locked !== false ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-attire rows="2">${h(r.attire || "")}</textarea>
              </div>
              <div class="char-wear-col">
                <div class="char-wear-head"><span>무기·기타</span><label class="char-lock"><input data-char-accessories-locked type="checkbox" ${r.accessories_locked !== false ? "checked" : ""}><span>고정</span></label></div>
                <textarea data-char-accessories rows="2">${h(r.accessories || "")}</textarea>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:end"><label><span>우선순위</span><input data-char-priority type="number" value="${h(r.priority ?? 0)}"></label><label><span>성별</span><select data-char-gender><option value="" ${!["girl","boy","other","female","male"].includes(String(r.gender||r.sex||""))?"selected":""}>미정</option><option value="girl" ${["girl","female"].includes(String(r.gender||r.sex||""))?"selected":""}>girl</option><option value="boy" ${["boy","male"].includes(String(r.gender||r.sex||""))?"selected":""}>boy</option><option value="other" ${String(r.gender||r.sex||"")==="other"?"selected":""}>other</option></select></label></div>
            <div class="autotag-status muted${l ? " pending" : ""}" data-autotag-status>${l ? "이 캐릭터 선택됨 · Ctrl+V로 이미지 붙여넣기 · 더블클릭으로 파일 선택" : "오토태그: 버튼 클릭=대상 선택(노란 표시) · 더블클릭=파일"}</div>
          </div>
        </details>`;
    }).join("") : `<div class="card"><div class="muted">${h(o)}</div></div>`;
  }
  function vt() {
    document.querySelectorAll(".char-card.autotag-armed").forEach((e) => e.classList.remove("autotag-armed")), document.querySelectorAll("[data-char-autotag].armed").forEach((e) => {
      e.classList.remove("armed"), e.textContent = "오토태그";
    }), document.querySelectorAll("[data-autotag-badge]").forEach((e) => {
      e.classList.remove("show"), e.textContent = "";
    });
  }
  function Qe(e, { open: n = !0 } = {}) {
    if (!e) return;
    vt(), t.autotagFocus = {
      scope: e.getAttribute("data-char-scope"),
      id: e.getAttribute("data-char-id") || ""
    }, e.classList.add("autotag-armed"), n && (e.open = !0);
    const o = e.querySelector("[data-char-autotag]");
    o && (o.classList.add("armed"), o.textContent = "붙여넣기 대기");
    const a = e.querySelector("[data-autotag-badge]");
    a && (a.classList.add("show"), a.textContent = "선택됨 · Ctrl+V");
    const r = e.querySelector("[data-autotag-status]");
    r && (r.className = "autotag-status muted pending", r.textContent = "이 캐릭터 선택됨 · Ctrl+V로 이미지 붙여넣기 · 더블클릭으로 파일 선택");
  }
  async function _t(e, n = "") {
    try {
      const o = await ve();
      if (!o.enabled)
        return y("info", "afterRequest.skip", "plugin disabled"), e;
      const a = w(e, 5e4);
      if (!a || a.length < 8)
        return y("info", "afterRequest.skip", "text too short"), e;
      const r = await Z({ useOverride: !1 });
      if (!r || r.charIndex < 0)
        return y("warn", "afterRequest.skip", "no scope"), e;
      try {
        await le();
      } catch {
      }
      try {
        if (!t.galleryUi?.root || !t.overlayUi?.root) await it();
      } catch {
      }
      const i = t.backendSettings?.card || {};
      if (i.power === !1) return y("info", "afterRequest.skip", "power off"), e;
      if (i.execute === "manual") return y("info", "afterRequest.skip", "execute=manual"), e;
      if (!i.auto_gen_on_reply) return y("info", "afterRequest.skip", "reply-auto-gen-off"), e;
      y("info", "afterRequest.gen", `chars=${a.length} session=${(r.sessionId || "").slice(-8)}`);
      await Be(r, a, !1);
      return e;
    } catch (o) {
      y("error", "afterRequest.fail", o?.message || o);
    }
    return e;
  }
  const ga = `
:root{color-scheme:dark;--bg:#080b12;--surface:#101622;--border:rgba(163,184,216,.14);--border2:rgba(163,184,216,.24);--accent:#7c6cff;--accent2:#9b8cff;--accent-soft:rgba(124,108,255,.14);--text:#f4f7fb;--muted:#a6b1c2;--muted2:#778398;--ok:#68d9a0;--warn:#f5c76d;--err:#ff7e92}
*{box-sizing:border-box}html{min-height:100%;background:var(--bg)}
body{min-height:100vh;margin:0;background:radial-gradient(circle at 12% 0,rgba(124,108,255,.13),transparent 32rem),var(--bg);color:var(--text);font:14px/1.6 "Segoe UI Variable Text",Pretendard,"Noto Sans KR","Segoe UI",system-ui,sans-serif}
button,input,select,textarea{font:inherit}
.wrap{width:min(1240px,100%);margin:0 auto;padding:24px clamp(16px,3vw,38px) 56px}
.chrome{position:sticky;top:0;z-index:200;margin:0 0 16px;padding:10px 0 8px;background:linear-gradient(180deg,rgba(8,11,18,.98) 70%,rgba(8,11,18,.88));backdrop-filter:blur(18px)}
.head{position:relative;z-index:2;display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0 0 10px;padding:10px 14px 10px 16px;min-height:92px;background:rgba(13,18,29,.92);border:1px solid var(--border);border-radius:18px}
.head-brand{flex:0 0 auto;min-width:0;display:flex;flex-direction:column;justify-content:center}
.head-help{flex:1 1 auto;min-width:320px;max-width:760px;height:72px;min-height:72px;max-height:72px;padding:8px 12px;border-radius:12px;border:1px solid var(--border);background:rgba(7,10,17,.55);display:flex;flex-direction:row;align-items:stretch;gap:10px;overflow:hidden;box-sizing:border-box}
.head-help.is-active{border-color:rgba(124,108,255,.35);background:rgba(124,108,255,.08)}
.head-help-title{flex:0 0 108px;width:108px;max-width:108px;display:flex;align-items:center;padding-right:10px;margin-right:2px;border-right:1px solid var(--border);font-size:10px;font-weight:740;color:var(--accent2);letter-spacing:.01em;line-height:1.25;word-break:keep-all;overflow:hidden}
.head-help-body{flex:1 1 auto;min-width:0;min-height:0;font-size:11px;line-height:1.4;color:var(--muted);overflow-x:hidden;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(163,184,216,.35) transparent}
.head-help-body::-webkit-scrollbar{width:6px}
.head-help-body::-webkit-scrollbar-thumb{background:rgba(163,184,216,.35);border-radius:999px}
.tabs{position:relative;z-index:2;margin:0!important}
h1{margin:0;font-size:clamp(18px,2.4vw,26px);font-weight:760;letter-spacing:-.035em}h1:before{content:"";display:inline-block;width:10px;height:10px;margin:0 11px 2px 1px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 5px var(--accent-soft)}
.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:18px 0}
.card,.model-card{background:linear-gradient(145deg,rgba(23,31,46,.94),rgba(14,20,31,.96));border:1px solid var(--border);border-radius:18px;padding:18px;box-shadow:0 12px 34px rgba(0,0,0,.18)}
.model-card{border-radius:20px;padding:22px;margin:15px 0}
.card strong{font-size:11px;font-weight:720;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.value{font-size:18px;font-weight:720;margin-top:7px}
button{min-height:38px;padding:8px 15px;border:1px solid rgba(255,255,255,.08);border-radius:11px;background:var(--accent);color:#fff;font-weight:680;cursor:pointer}
button.secondary{background:rgba(150,166,190,.1);border-color:var(--border);color:#dce4f0;box-shadow:none}
.tabs{display:flex;gap:7px;margin:20px 0 16px;padding:5px;width:max-content;max-width:100%;overflow:auto;background:rgba(17,23,35,.75);border:1px solid var(--border);border-radius:14px}
.tab{min-height:38px;padding:8px 17px;border:0;border-radius:10px;background:transparent;color:var(--muted);box-shadow:none}.tab.active{background:var(--accent-soft);color:#dcd7ff}
.notice{margin:16px 0;padding:13px 15px;border:1px solid;border-radius:14px;font-size:13px}.notice.info{background:rgba(67,126,218,.11);border-color:rgba(85,145,240,.3)}.notice.success{background:rgba(56,177,116,.1);border-color:rgba(75,210,142,.28)}.notice.error{background:rgba(219,72,94,.11);border-color:rgba(255,100,123,.3)}
.prompt-toolbar,.model-head,.model-actions,.toolbar-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
.prompt-toolbar{margin:6px 0 16px}.prompt-title{font-size:19px;font-weight:740;letter-spacing:-.02em}
.badge{white-space:nowrap;border:1px solid transparent;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:720}
.badge.default{background:rgba(57,193,124,.12);border-color:rgba(80,218,148,.18);color:var(--ok)}
.badge.custom{background:rgba(225,167,56,.13);border-color:rgba(245,199,109,.2);color:var(--warn)}
.model-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:18px}
.model-form label{display:flex;flex-direction:column;gap:6px;color:#bbc6d8;font-size:11px;font-weight:680;text-transform:uppercase;letter-spacing:.055em}
.model-form label.wide{grid-column:1/-1;text-transform:none}
.char-name-grid{grid-column:1/-1;display:grid;grid-template-columns:36px minmax(0,1fr) minmax(0,1.15fr);gap:6px 8px;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:rgba(7,10,17,.35)}
.char-wear-grid{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;align-items:start}
.char-wear-col{display:grid;gap:4px;min-width:0}
.char-wear-head{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:12px;font-weight:600;color:var(--muted)}
.char-lock{display:inline-flex;align-items:center;gap:4px;margin:0;padding:0;font-size:11px;font-weight:550;color:var(--text);cursor:pointer;white-space:nowrap;user-select:none}
.char-lock input{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;max-width:14px!important;margin:0;padding:0;flex:0 0 14px;accent-color:var(--accent)}
.char-wear-grid textarea{width:100%;min-height:56px;resize:vertical;box-sizing:border-box}
.char-name-corner{min-height:1px}.char-name-col{font-size:10px;font-weight:700;color:#778398;letter-spacing:.04em;text-transform:uppercase}
.char-name-row{font-size:11px;font-weight:700;color:#9aa6b8;letter-spacing:.04em}
.char-name-grid input{width:100%;min-height:34px;border:1px solid var(--border2);border-radius:9px;background:rgba(7,10,17,.7);color:var(--text);padding:6px 9px;font-size:13px}
.model-form label.check{flex-direction:row;align-items:center;gap:8px;text-transform:none;font-size:13px;font-weight:600;letter-spacing:0;color:var(--text);min-height:auto}
.model-form input:not([type=checkbox]),.model-form select,textarea{width:100%;min-height:41px;border:1px solid var(--border2);border-radius:11px;background:rgba(7,10,17,.7);color:var(--text);padding:9px 11px;font-size:13px}
.model-form input[type=checkbox],.toggle-row input[type=checkbox],.row input[type=checkbox]{width:16px!important;height:16px!important;min-width:16px!important;min-height:16px!important;max-width:16px!important;margin:0;padding:0;flex:0 0 16px;accent-color:var(--accent);border:none;background:transparent;border-radius:3px}
textarea{min-height:280px;resize:vertical;font:12.5px/1.65 Consolas,monospace}
.row{display:flex;align-items:center;gap:10px;margin-top:9px;flex-wrap:wrap}
.toggle-row{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:nowrap;line-height:1.4;color:var(--text);font-size:14px;font-weight:560;border-radius:10px;padding:4px 6px;margin-left:-6px;margin-right:-6px;cursor:help;transition:background .12s ease}
.toggle-row:hover,.toggle-row.is-help-active{background:rgba(124,108,255,.08)}
.toggle-row span{flex:1;min-width:0}
.model-form label[data-nx-help-id],.row button[data-nx-help-id]{cursor:help}
.model-form label.is-help-active{color:var(--text)}
.checks-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:4px 16px;margin-top:8px}
.preset-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 12px}
.preset-toolbar select{min-width:min(280px,100%);flex:1}
.preset-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.preset-chip{border:1px solid var(--border);background:rgba(150,166,190,.08);color:var(--muted);border-radius:999px;padding:5px 11px;min-height:30px;font-size:12px;font-weight:650}
.preset-chip.active{background:var(--accent-soft);border-color:rgba(124,108,255,.45);color:#e4e0ff}
.import-box{min-height:120px;font:12px/1.5 Consolas,monospace}
.section-split{height:1px;background:var(--border);margin:18px 0}
.model-hint{margin-top:14px}.model-actions{justify-content:flex-start;margin-top:15px;gap:9px;flex-wrap:wrap}
.nx-seg{display:flex;gap:0;border:1px solid var(--border2);border-radius:11px;overflow:hidden;background:rgba(7,10,17,.55)}
.nx-seg button{flex:1;min-height:40px;border:0;border-right:1px solid var(--border2);background:transparent;color:#9aa6b8;font-size:13px;font-weight:700;cursor:pointer;padding:8px 10px}
.nx-seg button:last-child{border-right:0}
.nx-seg button.active{background:rgba(124,108,255,.22);color:var(--text)}
.nx-comfy-help{margin-top:12px;padding:12px 14px;border:1px solid rgba(85,145,240,.28);border-radius:12px;background:rgba(67,126,218,.08);color:#c5d0e2;font-size:12.5px;line-height:1.55}
.nx-comfy-help code{font-family:Consolas,monospace;color:#e8eef8;background:rgba(0,0,0,.25);padding:1px 5px;border-radius:5px}
.test-result{color:var(--muted);font-size:12px;line-height:1.45;max-width:100%}
.test-result.success{color:var(--ok)}.test-result.error{color:var(--err)}.test-result.pending{color:var(--warn)}
.key-status{color:var(--ok);font-weight:700;margin-left:6px}
.prompt-group-label{font-size:11px;font-weight:750;color:#8995aa;text-transform:uppercase;letter-spacing:.11em;margin:24px 3px 8px;padding-bottom:9px;border-bottom:1px solid var(--border)}
.head-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}
.scope-bar .model-form{gap:10px}
.ref-preview{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:10px}
.ref-preview img{width:88px;height:88px;object-fit:cover;border-radius:12px;border:1px solid var(--border);background:#0b0f18}
.explorer-layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px;min-height:520px}
.explorer-side,.explorer-main{background:linear-gradient(145deg,rgba(23,31,46,.94),rgba(14,20,31,.96));border:1px solid var(--border);border-radius:18px;overflow:hidden}
.explorer-side{display:flex;flex-direction:column}
.explorer-side-head,.explorer-main-head{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.explorer-folders{flex:1;overflow:auto;padding:8px}
.explorer-folder{width:100%;text-align:left;border:0;background:transparent;color:var(--muted);padding:10px 12px;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;gap:3px}
.explorer-folder.active,.explorer-folder:hover{background:var(--accent-soft);color:#e8e4ff}
.explorer-folder strong{font-size:13px;font-weight:700;color:inherit}
.explorer-folder span{font-size:11px;opacity:.8}
.explorer-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.explorer-selbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 14px;border-bottom:1px solid var(--border);background:rgba(124,108,255,.08);min-height:44px}
.explorer-selbar .ex-mobile-select.active{background:var(--accent-soft);border-color:rgba(124,108,255,.45);color:#e4e0ff}
.explorer-grid{position:relative;display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--ex-thumb,148px),1fr));gap:12px;padding:14px;max-height:620px;overflow:auto;user-select:none}
.explorer-card{position:relative;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:rgba(7,10,17,.55);cursor:pointer;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
.explorer-card:hover{transform:translateY(-2px);border-color:rgba(124,108,255,.55)}
.explorer-card.selected{border-color:rgba(124,108,255,.9);box-shadow:0 0 0 2px rgba(124,108,255,.35)}
.explorer-card.focus{outline:2px solid rgba(232,228,255,.55);outline-offset:1px}
.explorer-card img{width:100%;aspect-ratio:3/4;object-fit:contain;display:block;background:#0b0f18;pointer-events:none}
.explorer-card .cap{padding:8px 10px;font-size:11px;color:#c4d0e2;line-height:1.35}
.explorer-card .ex-check{position:absolute;left:8px;top:8px;width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.35);z-index:2;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
.explorer-card.selected .ex-check{background:var(--accent);border-color:transparent}
.explorer-card .ex-star{position:absolute;right:6px;top:6px;z-index:3;border:0;margin:0;padding:0;background:rgba(8,12,20,.72);color:#fbbf24;border-radius:999px;width:36px;height:36px;min-width:36px;min-height:36px;cursor:pointer;font-size:18px;line-height:1;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35);-webkit-tap-highlight-color:transparent}
.explorer-card .ex-star:hover,.explorer-card .ex-star:focus-visible{background:rgba(20,28,44,.9);transform:scale(1.06)}
.explorer-card .ex-star.is-on{background:rgba(251,191,36,.22);color:#fcd34d}
.explorer-marquee{position:absolute;border:1px solid rgba(124,108,255,.8);background:rgba(124,108,255,.15);pointer-events:none;z-index:5;display:none}
.explorer-tip{position:fixed;z-index:40;pointer-events:none;max-width:280px;padding:10px 12px;border-radius:12px;background:rgba(10,14,22,.95);border:1px solid rgba(163,184,216,.28);color:#e8eef8;font-size:12px;box-shadow:0 12px 30px rgba(0,0,0,.35);display:none}
.explorer-ctx{position:fixed;z-index:60;min-width:180px;padding:6px;border-radius:12px;background:rgba(12,16,24,.98);border:1px solid rgba(163,184,216,.28);box-shadow:0 16px 40px rgba(0,0,0,.45);display:none}
.explorer-ctx button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#e8eef8;padding:8px 10px;border-radius:8px;font-size:12px;cursor:pointer}
.explorer-ctx button:hover{background:rgba(124,108,255,.18)}
.explorer-lightbox{position:fixed;inset:0;z-index:300;display:none;background:rgba(0,0,0,.92);align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:16px;box-sizing:border-box}
.explorer-lightbox.show{display:flex}
.explorer-lightbox .lb-stage{position:relative;flex:1;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:default}
.explorer-lightbox img{max-width:100%;max-height:calc(100dvh - 120px);object-fit:contain;transform-origin:center center;user-select:none;-webkit-user-drag:none;cursor:grab}
.explorer-lightbox .lb-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;pointer-events:auto}
.explorer-lightbox .lb-bar .ex-mobile-select.active{background:var(--accent-soft);border-color:rgba(124,108,255,.45);color:#e4e0ff}
.model-form-pair{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
.preset-chip{cursor:grab}.preset-chip.dragging{opacity:.45}.preset-chip.drag-over{outline:2px dashed rgba(124,108,255,.7)}
@media(max-width:700px){.model-form-pair{grid-template-columns:1fr}}
.progress-rail{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:8px}
.progress-fill{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#7c6cff,#9b8cff);transition:width .25s ease}
.save-flash{font-size:11px;color:var(--ok);min-width:4em;text-align:right}
.autotag-status{grid-column:1/-1;font-size:12px;line-height:1.4}
.autotag-status.pending{color:var(--warn)}.autotag-status.ok{color:var(--ok)}.autotag-status.err{color:var(--err)}
.char-card.autotag-armed{border-color:rgba(255,196,72,.9)!important;box-shadow:0 0 0 1px rgba(255,196,72,.4),0 10px 28px rgba(255,196,72,.12)}
button[data-char-autotag]{min-height:30px;padding:4px 10px;flex-shrink:0;transition:background .15s ease,border-color .15s ease,color .15s ease}
button[data-char-autotag].armed{background:rgba(255,196,72,.24);border-color:rgba(255,196,72,.8);color:#ffe7a8;font-weight:800}
.autotag-badge{display:none;font-size:11px;font-weight:750;color:#ffe7a8;background:rgba(255,196,72,.2);border:1px solid rgba(255,196,72,.5);border-radius:999px;padding:3px 9px;white-space:nowrap;flex-shrink:0}
.autotag-badge.show{display:inline-flex;align-items:center}
@media(max-width:900px){.explorer-layout{grid-template-columns:1fr}.head{flex-wrap:wrap;min-height:0;align-items:stretch}.head-help{order:3;flex:1 1 100%;max-width:none;min-width:0;height:72px;min-height:72px;max-height:72px}.head-help-title{flex-basis:96px;width:96px;max-width:96px}}
@media(max-width:700px){.model-form{grid-template-columns:1fr}.model-head{align-items:flex-start;flex-direction:column}.head-actions{flex-wrap:wrap;justify-content:flex-end}}
`;
  const HEAD_HELP_DEFAULT = {
    title: "도움말",
    body: "설정에 마우스를 올리면 설명이 여기에 나타납니다."
  };
  const HEAD_HELP = {
    "nx-power": { title: "Power ON", body: "플러그인 전체를 켜거나 끕니다. 끄면 이미지 생성과 표시가 멈춥니다." },
    "nx-floating-viewer": { title: "플로팅 뷰어", body: "채팅 위에 이미지 창을 항상 띄워 둡니다. 끌어서 옮기고 모서리를 잡아 크기를 바꿀 수 있습니다. 캐릭터·프롬프트 수정 창이 열리면 잠시 숨겨집니다." },
    "nx-overlay": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽에 핀과 이미지를 함께 둡니다. 스크롤하는 동안에도 지금 읽는 구간의 이미지를 계속 보여 줍니다. 짧게 누르면 이미지를 숨기고, 핀을 누르면 다시 나타납니다. 길게 누르면 크게보기와 태그·재생성·리롤·캐릭터 칩 메뉴가 열립니다." },
    "nx-llm-anchor": { title: "LLM 읽기 위치 배치", body: "ON이면 AI가 장면 흐름에 맞춰 읽기 위치(y%)를 잡아 저장·표시합니다. OFF면 저장값은 그대로 두고, 화면에서만 메시지 높이를 장 수로 균등 분할해 보여 줍니다(예: 3장 → 0–33 / 33–66 / 66–100). 다시 ON하면 저장된 AI 위치로 돌아갑니다." },
    "nx-natural-base": { title: "자연어 base", body: "NovelAI base에 넣는 자연어 장면을 고릅니다. 안넣기 / 짧게 넣기(머리·나이·성별·행동) / 구도·자세히(구도·표정·옷·조명) / 태그 보완 자연어(태그가 못 담는 문장)." },
  "nx-person-tag-weight": { title: "사람 태그 강조", body: "메인 프롬프트 맨 앞 인원 태그(1girl, 1boy…)에 NovelAI 강조(N::태그::)를 겁니다. 0=감싸지 않음, 1–5=가중치. 큐레이션 leaf의 composition 인원 태그는 넣지 않습니다." },
  "nx-curation-mode": { title: "큐레이팅 모드", body: "사용안함: 지금과 동일. 2단: 그룹 선택 후 하위 옵션으로 씬 태그. 임베딩식: 자유 씬 태그를 카탈로그와 유사도 매칭해 교체(캐릭터 태그는 유지)." },
  "nx-curation-strict-ids": { title: "엄격 ID 모드", body: "2단 모드 전용. 켜면 카메라·상황·자연어·동작/표정을 자유 문장으로 쓰지 않고 카탈로그 ID로만 조립합니다. 캐릭터별 ID(characters[].option_ids)도 추가로 받아 배우 index별로 적용하며, 외형/의상은 절대 덮어쓰지 않습니다." },
  "nx-curation-catalog": { title: "큐레이션 카탈로그", body: "Inlay groups JSON 또는 Asset Maid DEFAULT_PRESET_CATALOG(modifier_library)를 불러올 수 있습니다. 기본은 소형 SFW. 거대 카탈로그는 저장소·임베딩 비용이 큽니다." },
  "nx-curation-embed": { title: "임베딩 생성", body: "카탈로그 옵션을 벡터로 만들어 기기에 저장합니다. 임베딩식 모드에서 씬 태그 스냅에 사용. 미생성·실패 시 사용안함과 동일하게 생성됩니다." },
  "nx-curation-embedding-provider": { title: "임베딩 모델", body: "모델 설정 탭과 같은 UX입니다. Provider를 바꾸면 Endpoint·Model 기본값이 따라갑니다. OpenAI / Voyage / OpenRouter / LM Studio / Ollama / Custom. networkFetch로 호출합니다." },
    "nx-inline-preview": { title: "채팅 왼쪽 줄 오버레이", body: "채팅 왼쪽 줄 오버레이와 같은 설정입니다." },
    "nx-hide-offscreen": { title: "화면 밖이면 이미지 숨김", body: "선택한 메시지가 화면에서 벗어나면 상시 미리보기 이미지만 숨깁니다. 스티키 핀은 그대로 둡니다." },
    "nx-scroll-track": { title: "스크롤로 메시지 추적", body: "채팅을 스크롤하다가 멈추면(짧게), 마우스 커서에 가장 가까운 메시지를 고릅니다. 스크롤 중에는 스티키만 가볍게 갱신하고, 이미지 없는 메시지로 넘어가도 이전 대표 이미지는 유지합니다." },
    "nx-click-track": { title: "메시지 클릭으로 선택", body: "메시지를 눌러 그 메시지의 이미지를 볼 수 있게 합니다. 아래 「메시지 선택 동작」에서 한 번/두 번 클릭을 고를 수 있습니다." },
    "nx-text-drag": { title: "글자 드래그 선택", body: "메시지 안 글자를 드래그해 고르면 그 메시지를 바로 선택합니다. 한 번/두 번 클릭 설정과 관계없이 동작합니다." },
    "nx-mobile-pin": { title: "모바일 모서리 고정", body: "상시 이미지를 화면 모서리(우상·우하·좌상·좌하)에 붙이고, 스티키 핀을 그 이미지 상단 중앙에 둡니다. 핀 X/Y % 위치는 이 모드에서 쓰지 않습니다. 제스처는 상시 이미지와 같습니다." },
    "nx-hover-preview": { title: "스티키 핀 호버 미리보기", body: "왼쪽 핀에 마우스를 올리면 미리보기 이미지가 뜹니다. 끄면 호버 미리보기를 쓰지 않습니다." },
    "nx-risu-settings-button": { title: "Risu 설정 바로가기", body: "RisuAI 설정 화면으로 바로 가는 버튼을 보여 줍니다." },
    "nx-debug-panel": { title: "디버그 패널", body: "채팅 왼쪽 아래에 로그 창을 띄웁니다. 문제 확인할 때만 켜고, 평소에는 꺼 두셔도 됩니다." },
    "nx-gen-all-roles": { title: "모든 메시지 이미지 생성", body: "켜면 유저/캐릭터 구분 없이 선택한 모든 메시지에 이미지를 생성합니다. 끄면 캐릭터(assistant) 메시지만 자동 생성합니다." },
    "nx-auto-gen-reply": { title: "응답 후 자동 생성", body: "AI 답변이 끝나면 메시지를 클릭하지 않아도 이미지를 만듭니다. 이미 이미지가 있으면 건너뜁니다(덮어쓰지 않음). Power OFF이거나 발동이 수동일 때는 동작하지 않습니다." },
    "nx-lore": { title: "Lorebook 주입", body: "이미지 태그를 만들 때 로어북에 적힌 설정을 참고합니다. 세계관·외형 메모가 반영되기 쉽습니다." },
    "nx-lore-extra": { title: "lb-xnai.lb.extra", body: "캐릭터 태그만: 트리거된 캐릭터 섹션만 넣습니다. 전체: 로어 통째로(커스텀 프롬프트 포함). 넣지 않음: 이 특수 로어를 무시합니다." },
    "nx-unified-priority": { title: "통합 챗 우선", body: "켜면 채팅 목록에서 통합 챗이 맨 위에 오고, 캐릭터만 바꿀 때 기본 선택도 통합 챗이 됩니다. 생성/재생성 태그는 모든 채팅 로스터를 합쳐서 읽습니다(저장은 현재 채팅에만)." },
    "nx-charinfo": { title: "CharInfo", body: "캐릭터 카드의 기본 정보를 태깅에 넣습니다. 외형·성격이 더 맞게 나오도록 돕습니다." },
    "nx-userinfo": { title: "UserInfo", body: "유저(페르소나) 정보를 태깅에 넣습니다. 주인공 외형이 있을 때 켜세요." },
    "nx-appearance": { title: "CharAppearance 누적", body: "한 번 잡힌 캐릭터 외형을 다음 생성에도 이어 씁니다. 옷·머리색이 장면마다 크게 바뀌는 걸 줄입니다." },
    "nx-execute": { title: "발동", body: "자동: 메시지를 골랐는데 이미지가 없으면 바로 생성합니다. 수동: 이미지가 없어도 「지금 생성」을 눌러야만 만듭니다. 응답 후 자동 생성 토글은 별도이며, 발동이 수동일 때는 응답 후 생성도 막힙니다." },
    "nx-inline-pct": { title: "상시 이미지 크기", body: "상시·모바일 모서리 미리보기 크기입니다. 100%가 기준이고, 200%면 약 두 배로 보입니다." },
    "nx-overlay-x": { title: "스티키 핀 가로 위치 (%)", body: "화면 왼쪽 기준 가로 퍼센트입니다(0=왼쪽, 100=오른쪽). 창 크기가 바뀌어도 같은 비율로 유지됩니다. 기본값 38." },
    "nx-overlay-y": { title: "스티키 핀 세로 위치 (%)", body: "화면 아래 기준 세로 퍼센트입니다(0=맨 아래, 100=맨 위). 창 크기가 바뀌어도 같은 비율로 유지됩니다. 기본값 80." },
    "nx-hover-anchor": { title: "호버 미리보기 기준", body: "미리보기를 화면의 정해진 자리에 둘지, 마우스 옆에 따라다니게 할지 정합니다. 마우스 기준은 위치를 가볍게만 갱신합니다." },
    "nx-minimize-mode": { title: "접힘 표시 방식", body: "플로팅 아이콘: 접으면 작은 아이콘으로 따로 둔 자리로 갑니다. 상단 툴바 한 줄: 접어도 지금 창 자리 그대로 얇은 바로만 줄어듭니다." },
    "nx-select-gesture": { title: "메시지 선택 동작", body: "클릭으로 고를 때만 적용됩니다. 한 번: 바로 확정. 두 번: 첫 클릭은 임시, 같은 메시지 두 번째 클릭에 확정. 스크롤·글자 드래그는 이 설정과 무관합니다." },
    "nx-hover-corner": { title: "이미지 모서리", body: "모바일 모서리 고정이 켜져 있을 때 상시 이미지를 붙일 모서리(우상·우하·좌상·좌하)를 고릅니다. 스티키 핀은 그 이미지 상단 중앙에 따라갑니다." },
    "nx-reset-windows": { title: "창 위치 초기화", body: "뷰어·접힘 아이콘·핀이 화면 밖으로 나가 안 보일 때 기본 위치로 되돌립니다." },
    "nx-reset-settings": { title: "모든 설정 초기화", body: "카드·LLM·NAI 등 설정을 기본값으로 되돌립니다. API 키·창 위치·카드 프리셋은 유지됩니다." },
    "nx-save-dash": { title: "대시보드 저장", body: "이 탭의 설정을 저장합니다. 대부분 항목은 바꾸면 자동으로도 저장됩니다." },
    "nx-run-now": { title: "지금 생성", body: "지금 선택된 메시지로 이미지를 바로 만듭니다. 수동일 때는 이미지가 없어도 이 버튼을 눌러야 생성됩니다." },
    "nx-open-viewer": { title: "뷰어 앞으로", body: "플로팅 뷰어를 열고 맨 앞으로 가져옵니다." }
  };
  function setHeadHelp(e = null) {
    const n = document.getElementById("nx-head-help"), o = document.getElementById("nx-head-help-title"), a = document.getElementById("nx-head-help-body");
    if (!o || !a) return;
    const r = e && e.title ? e : HEAD_HELP_DEFAULT;
    o.textContent = r.title || HEAD_HELP_DEFAULT.title, a.textContent = r.body || HEAD_HELP_DEFAULT.body, n && n.classList.toggle("is-active", !!(e && e.title));
  }
  function resolveHeadHelpTarget(e) {
    const n = e?.closest?.("[data-nx-help-id], .toggle-row, .model-form label, #nx-reset-windows, #nx-reset-settings, #nx-save-dash, #nx-run-now, #nx-open-viewer");
    if (!n) return null;
    const o = n.getAttribute("data-nx-help-id") || (n.id && HEAD_HELP[n.id] ? n.id : "") || n.querySelector?.("input[id],select[id],button[id]")?.id || "";
    return o && HEAD_HELP[o] ? { id: o, tip: HEAD_HELP[o], host: n } : null;
  }
  function bindHeadHelp(e) {
    if (!e || e.dataset.nxHelpBound) return;
    e.dataset.nxHelpBound = "1";
    let n = null;
    const o = (a) => {
      document.querySelectorAll(".is-help-active").forEach((i) => i.classList.remove("is-help-active"));
      const r = resolveHeadHelpTarget(a);
      if (!r) {
        n = null, setHeadHelp(null);
        return;
      }
      n = r.id, r.host.classList.add("is-help-active"), setHeadHelp(r.tip);
    };
    e.addEventListener("pointerover", (a) => {
      const r = resolveHeadHelpTarget(a.target);
      if (!r || r.id === n) return;
      if (a.relatedTarget && r.host.contains(a.relatedTarget)) return;
      o(a.target);
    }), e.addEventListener("pointerout", (a) => {
      const r = resolveHeadHelpTarget(a.target);
      if (!r) return;
      const i = a.relatedTarget;
      if (i && r.host.contains(i)) return;
      const s = resolveHeadHelpTarget(i);
      if (s) {
        o(i);
        return;
      }
      n = null, document.querySelectorAll(".is-help-active").forEach((c) => c.classList.remove("is-help-active")), setHeadHelp(null);
    }), e.addEventListener("focusin", (a) => o(a.target)), e.addEventListener("focusout", (a) => {
      const r = a.relatedTarget;
      if (r && e.contains(r) && resolveHeadHelpTarget(r)) {
        o(r);
        return;
      }
      n = null, document.querySelectorAll(".is-help-active").forEach((i) => i.classList.remove("is-help-active")), setHeadHelp(null);
    }), setHeadHelp(null);
  }

  function $t(e) {
    const n = t.modelTestResults[e];
    return n ? `<div id="nx-test-result-${e}" class="test-result ${n.ok ? "success" : "error"}">${n.ok ? "성공 · " : "실패 · "}${h(n.message || "")}</div>` : `<div id="nx-test-result-${e}" class="test-result">아직 테스트하지 않았습니다.</div>`;
  }
  function je(e, n, o) {
    t.modelTestResults[e] = {
      ok: !!n,
      message: z(o || "", 400)
    };
    const a = document.getElementById(`nx-test-result-${e}`);
    a && (a.className = `test-result ${n ? "success" : "error"}`, a.textContent = `${n ? "성공" : "실패"} · ${t.modelTestResults[e].message}`);
  }
  function kt(e) {
    t.backendSettings || (t.backendSettings = {}), t.backendSettings.card || (t.backendSettings.card = e || {});
    const n = t.backendSettings.card;
    if (Array.isArray(n.presets) || (n.presets = []), !n.presets.length && (n.custom_pos || n.custom_neg)) {
      const o = `legacy_${Date.now()}`;
      n.presets.push({
        id: o,
        name: "기본",
        positive: n.custom_pos || "",
        negative: n.custom_neg || ""
      }), pinActivePreset(n, o);
    }
    const resolved = resolveActivePresetId(n);
    return resolved && pinActivePreset(n, resolved), n;
  }
  function _e() {
    const e = kt(t.backendSettings?.card || {}), n = e.presets.find((a) => String(a.id) === String(e.active_preset_id));
    if (!n) return e;
    // Form absent (settings closed / other tab) — never wipe preset text with empty N().
    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null, cfgEl = typeof document < "u" ? document.getElementById("nx-preset-cfg") : null, rescaleEl = typeof document < "u" ? document.getElementById("nx-preset-rescale") : null;
    if (!nameEl && !posEl && !negEl && !cfgEl && !rescaleEl) return e;
    nameEl && (n.name = nameEl.value || "");
    posEl && (n.positive = posEl.value || "", e.custom_pos = n.positive);
    negEl && (n.negative = negEl.value || "", e.custom_neg = n.negative);
    if (cfgEl) {
      const v = String(cfgEl.value || "").trim();
      n.cfg_scale = v === "" ? null : Number(v);
      if (n.cfg_scale != null && !Number.isFinite(n.cfg_scale)) n.cfg_scale = null;
    }
    if (rescaleEl) {
      const v = String(rescaleEl.value || "").trim();
      n.cfg_rescale = v === "" ? null : Number(v);
      if (n.cfg_rescale != null && !Number.isFinite(n.cfg_rescale)) n.cfg_rescale = null;
    }
    return e;
  }
  function fa(e) {
    // Persist the form into the preset the DOM currently shows, then switch.
    // Snapshot the form owner BEFORE any pin/resolve — if t.activePresetId was
    // already moved to the target, _e()/kt() would write preset-1 text into every other preset.
    const id = String(e || "");
    const n = t.backendSettings?.card || {};
    Array.isArray(n.presets) || (n.presets = []);
    const formOwnerId = String(n.active_preset_id || t.activePresetId || "");
    const owner = formOwnerId ? n.presets.find((a) => String(a.id) === formOwnerId) : null;
    const nameEl = typeof document < "u" ? document.getElementById("nx-preset-name") : null, posEl = typeof document < "u" ? document.getElementById("nx-custom-pos") : null, negEl = typeof document < "u" ? document.getElementById("nx-custom-neg") : null, cfgEl = typeof document < "u" ? document.getElementById("nx-preset-cfg") : null, rescaleEl = typeof document < "u" ? document.getElementById("nx-preset-rescale") : null;
    if (owner && (nameEl || posEl || negEl || cfgEl || rescaleEl)) {
      nameEl && (owner.name = nameEl.value || "");
      posEl && (owner.positive = posEl.value || "", n.custom_pos = owner.positive);
      negEl && (owner.negative = negEl.value || "", n.custom_neg = owner.negative);
      if (cfgEl) {
        const v = String(cfgEl.value || "").trim();
        owner.cfg_scale = v === "" ? null : Number(v);
        if (owner.cfg_scale != null && !Number.isFinite(owner.cfg_scale)) owner.cfg_scale = null;
      }
      if (rescaleEl) {
        const v = String(rescaleEl.value || "").trim();
        owner.cfg_rescale = v === "" ? null : Number(v);
        if (owner.cfg_rescale != null && !Number.isFinite(owner.cfg_rescale)) owner.cfg_rescale = null;
      }
    }
    if (!id || !n.presets.some((a) => String(a.id) === id)) return n;
    pinActivePreset(n, id);
    const o = n.presets.find((a) => String(a.id) === id);
    return o && (n.custom_pos = o.positive || "", n.custom_neg = o.negative || ""), n;
  }
  async function applyActivePreset(presetId, opts = null) {
    const id = String(presetId || "");
    if (!id || t._presetSwitching) return null;
    const formMounted = !!(t.uiOpen && typeof document < "u" && document.getElementById("nx-custom-pos"));
    let card;
    if (formMounted) {
      // Persist old form first; fa() pins the new id. Do NOT set t.activePresetId before fa().
      card = fa(id);
    } else {
      t.activePresetId = id;
      card = kt(t.backendSettings?.card || {});
      if (!card.presets.some((p) => presetIdEq(p.id, id))) return null;
      pinActivePreset(card, id);
      const active = card.presets.find((p) => presetIdEq(p.id, id));
      active && (card.custom_pos = active.positive || "", card.custom_neg = active.negative || "");
    }
    if (!card?.presets?.some((p) => presetIdEq(p.id, id))) return null;
    pinActivePreset(card, id);
    t._presetSwitching = !0;
    try {
      t.backendSettings = t.backendSettings || {}, t.backendSettings.card = card;
      if (t.settingsSavePending?.card) {
        t.settingsSavePending.card.active_preset_id = id, t.settingsSavePending.card.custom_pos = card.custom_pos, t.settingsSavePending.card.custom_neg = card.custom_neg;
        Array.isArray(card.presets) && (t.settingsSavePending.card.presets = card.presets);
      }
      queueSettingsSave({ card: { ...card } }, { force: !0 }), await flushSettingsSave();
      try {
        await pe({
          card: {
            active_preset_id: id,
            custom_pos: card.custom_pos,
            custom_neg: card.custom_neg,
            presets: card.presets
          }
        });
      } catch (err) {
        y("warn", "preset.save.fail", err?.message || err);
      }
      if (t.backendSettings?.card) {
        pinActivePreset(t.backendSettings.card, id), t.backendSettings.card.custom_pos = card.custom_pos, t.backendSettings.card.custom_neg = card.custom_neg;
        Array.isArray(card.presets) && (t.backendSettings.card.presets = card.presets);
      }
      // Always push into card-settings DOM when it exists; re-render if settings open.
      syncCardPresetFormFromSettings();
      if (t.uiOpen && opts?.rerender !== !1) {
        if (opts?.showCardTab) t.uiTab = "card";
        await P();
        syncCardPresetFormFromSettings();
      }
    } finally {
      t._presetSwitching = !1;
    }
    if (t.galleryUi?.syncViewerPresetSelect) try {
      await t.galleryUi.syncViewerPresetSelect();
    } catch {
    }
    return card;
  }
  function St(e) {
    const n = pn(e);
    if (!n.length) throw new Error("프리셋을 찾지 못했습니다. [Positive]/[Negative] 로어북 항목이 있는 card.json인지 확인하세요.");
    const o = _e();
    o.presets = un(o.presets || [], n);
    if (!o.active_preset_id || !o.presets.some((r) => presetIdEq(r.id, o.active_preset_id))) pinActivePreset(o, o.presets[0]?.id || "");
    else pinActivePreset(o, o.active_preset_id);
    const a = o.presets.find((r) => presetIdEq(r.id, o.active_preset_id)) || o.presets[0];
    o.custom_pos = a?.positive || "", o.custom_neg = a?.negative || "";
    try {
      queueSettingsSave({ card: { ...o } });
    } catch (err) {
      console.warn("[Inlay Nexus] preset auto-save failed", err);
    }
    return n.length;
  }
  function exportPresetsJson() {
    const e = _e(), n = (e.presets || []).map((a) => {
      const cfg = a.cfg_scale == null || a.cfg_scale === "" ? null : Number(a.cfg_scale), rescale = a.cfg_rescale == null || a.cfg_rescale === "" ? null : Number(a.cfg_rescale);
      return {
        id: String(a.id || ""),
        name: String(a.name || ""),
        positive: String(a.positive || ""),
        negative: String(a.negative || ""),
        cfg_scale: cfg != null && Number.isFinite(cfg) ? cfg : null,
        cfg_rescale: rescale != null && Number.isFinite(rescale) ? rescale : null
      };
    }).filter((a) => a.name || a.positive || a.negative || a.cfg_scale != null || a.cfg_rescale != null);
    if (!n.length) throw new Error("내보낼 프리셋이 없습니다.");
    const o = JSON.stringify({
      presets: n,
      active_preset_id: String(e.active_preset_id || n[0].id || "")
    }, null, 2), a = new Blob([o], { type: "application/json" }), r = URL.createObjectURL(a), i = document.createElement("a");
    return i.href = r, i.download = `inlay-nexus-presets-${new Date().toISOString().slice(0, 10)}.json`, document.body.appendChild(i), i.click(), i.remove(), setTimeout(() => URL.revokeObjectURL(r), 1e3), n.length;
  }
  function N(e) {
    const n = document.getElementById(e);
    return n ? n.value : "";
  }
  function ee(e) {
    const n = document.getElementById(e);
    return !!(n && n.checked);
  }
  function It(e) {
    return new Promise((n, o) => {
      const a = new FileReader();
      a.onload = () => n(String(a.result || "")), a.onerror = () => o(/* @__PURE__ */ new Error("파일 읽기 실패")), a.readAsDataURL(e);
    });
  }
  function exHelpers() {
    return globalThis.__INLAY_EXPLORER__ || {};
  }
  function ensureExplorerState() {
    const EX = exHelpers();
    if (!t.explorer) t.explorer = {};
    if (!t.explorer.selection) t.explorer.selection = EX.createSelectionState ? EX.createSelectionState() : { selected: new Set(), anchorId: "", focusId: "" };
    if (!(t.explorer.selection.selected instanceof Set)) t.explorer.selection.selected = new Set(t.explorer.selection.selected || []);
    if (!Array.isArray(t.explorer.favorites)) t.explorer.favorites = [];
    if (!t.explorer.sort) t.explorer.sort = "newest";
    if (!t.explorer.thumb) t.explorer.thumb = "m";
    if (t.explorer.favOnly == null) t.explorer.favOnly = !1;
    if (t.explorer.mobileSelect == null) t.explorer.mobileSelect = !1;
    return t.explorer;
  }
  async function Et(e = !1) {
    if (!e && t.explorer?.loadedAt && Date.now() - t.explorer.loadedAt < 2500) return t.explorer;
    ensureExplorerState();
    const n = await K("/v1/gallery/explore?limit=500", { method: "GET" }, 2e4), o = n?.folders || [], a = n?.items || [];
    let fav = t.explorer.favorites || [];
    try {
      const f = await K("/v1/gallery/favorites", { method: "GET" }, 1e4);
      if (Array.isArray(f?.ids)) fav = f.ids;
    } catch {
    }
    let r = t.explorer?.folderKey || "";
    return (r !== "__all__" && (!r || !o.some((i) => i.key === r))) && (r = "__all__"), t.explorer = {
      ...t.explorer,
      folders: o,
      items: a,
      folderKey: r,
      query: t.explorer?.query || "",
      favorites: fav,
      loadedAt: Date.now()
    }, t.explorer;
  }
  function Ze() {
    const EX = exHelpers();
    const e = ensureExplorerState(), n = w(e.query || "").toLowerCase(), o = e.folders || [];
    let a = e.folderKey || "";
    if (a !== "__all__" && (!a || !o.some((f) => f.key === a))) a = o[0]?.key || "__all__";
    const allMode = a === "__all__";
    let r = (e.items || []).filter((i) => allMode || !a || i.folder_key === a);
    n && (r = r.filter((i) => `${i.character_name || ""} ${i.chat_name || ""} ${i.assistant_preview || ""} ${i.main_prompt || ""}`.toLowerCase().includes(n)));
    if (e.favOnly) {
      const fav = new Set(e.favorites || []);
      r = r.filter((i) => fav.has(i.id));
    }
    r = EX.sortExplorerItems ? EX.sortExplorerItems(r, e.sort || "newest") : r;
    return {
      ex: e,
      q: n,
      folders: o,
      folderKey: a,
      items: r,
      allMode
    };
  }
  function et(e) {
    const ex = ensureExplorerState(), sel = ex.selection?.selected || new Set(), fav = new Set(ex.favorites || []), focus = ex.selection?.focusId || "";
    return e.length ? e.map((n) => `
      <div class="explorer-card ${sel.has(n.id) ? "selected" : ""} ${focus === n.id ? "focus" : ""}" data-explorer-id="${h(n.id)}" tabindex="0"
        data-tip="${h(`${n.character_name || "?"} / ${n.chat_name || "?"}
메시지 #${Number(n.message_index) >= 0 ? n.message_index + 1 : "?"} · 샷 ${Number(n.shot_index) + 1}
${(n.assistant_preview || "").slice(0, 120)}`)}">
        <div class="ex-check">${sel.has(n.id) ? "✓" : ""}</div>
        <button type="button" class="ex-star ${fav.has(n.id) ? "is-on" : ""}" data-explorer-star title="즐겨찾기" aria-label="즐겨찾기">${fav.has(n.id) ? "★" : "☆"}</button>
        <img src="${h(Ie(n))}" alt="" loading="lazy">
        <div class="cap">msg #${Number(n.message_index) >= 0 ? n.message_index + 1 : "?"} · shot ${Number(n.shot_index) + 1}<br>${h((n.assistant_preview || n.main_prompt || "").slice(0, 48))}</div>
      </div>`).join("") : '<div class="muted" style="padding:18px">이 폴더에 이미지가 없습니다.</div>';
  }
  function paintExplorerSelectionUi() {
    const { items: n } = Ze(), ex = ensureExplorerState(), count = ex.selection?.selected?.size || 0;
    const bar = document.getElementById("nx-explorer-selbar");
    if (bar) {
      const countEl = bar.querySelector("[data-ex-selcount]");
      countEl && (countEl.textContent = count ? `${count}장 선택` : "선택 없음");
      const mobBtn = bar.querySelector("#nx-explorer-mobile-select");
      mobBtn && mobBtn.classList.toggle("active", !!ex.mobileSelect);
      const favBtn = bar.querySelector("#nx-explorer-favonly");
      favBtn && (favBtn.classList.toggle("active", !!ex.favOnly), favBtn.textContent = ex.favOnly ? "★ 즐겨찾기만" : "☆ 즐겨찾기만");
    }
    document.querySelectorAll("[data-explorer-id]").forEach((el) => {
      const id = el.getAttribute("data-explorer-id");
      el.classList.toggle("selected", !!ex.selection?.selected?.has(id));
      el.classList.toggle("focus", ex.selection?.focusId === id);
      const check = el.querySelector(".ex-check");
      check && (check.textContent = ex.selection?.selected?.has(id) ? "✓" : "");
      const img = el.querySelector("img");
      if (img && id) {
        try {
          const src = Ie({ id });
          if (typeof src == "string" && /^data:image\//i.test(src) && img.getAttribute("src") !== src) img.setAttribute("src", src);
        } catch {
        }
      }
    });
    const r = document.querySelector(".explorer-toolbar .muted");
    r && (r.textContent = `${n.length}장`);
  }
  function ha(e) {
    t.explorer = {
      ...ensureExplorerState(),
      folderKey: e || ""
    };
    const EX = exHelpers();
    t.explorer.selection = EX.clearSelection ? EX.clearSelection(t.explorer.selection) : { selected: new Set(), anchorId: "", focusId: "" };
    const { items: n, folderKey: o } = Ze();
    document.querySelectorAll("[data-explorer-folder]").forEach((i) => {
      i.classList.toggle("active", i.getAttribute("data-explorer-folder") === o);
    });
    const a = document.querySelector(".explorer-grid");
    a && (a.innerHTML = `<div class="explorer-marquee" id="nx-explorer-marquee"></div>${et(n)}`);
    const thumb = EX.thumbMinWidth ? EX.thumbMinWidth(t.explorer.thumb) : 148;
    a && a.style.setProperty("--ex-thumb", `${thumb}px`);
    paintExplorerSelectionUi(), tt();
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const ids = [...new Set((n || []).map((x) => x && x.id).filter(Boolean))];
      if (ids.length) {
        if (typeof N?.pinImageUrls == "function") N.pinImageUrls(ids);
        const done = () => {
          try {
            paintExplorerSelectionUi();
          } catch {
          }
        };
        if (typeof N?.warmImages == "function") N.warmImages(ids).then(done).catch(() => {
        });
        else if (typeof N?.ensureImageUrl == "function") Promise.all(ids.map((id) => N.ensureImageUrl(id).catch(() => ""))).then(done).catch(() => {
        });
      }
    } catch {
    }
  }
  function downloadBase64Zip(b64, filename) {
    const bin = atob(String(b64 || ""));
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const blob = new Blob([u8], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url, a.download = filename || "inlay-gallery.zip", a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2e3);
  }
  async function explorerExport(scope = "selection") {
    const ex = ensureExplorerState(), body = {};
    if (scope === "all") body.all = !0;
    else if (scope === "folder") {
      if (!ex.folderKey || ex.folderKey === "__all__") body.all = !0;
      else body.folder_key = ex.folderKey || "";
    } else body.card_ids = [...ex.selection?.selected || []];
    if (scope === "selection" && !body.card_ids.length) {
      $e("선택된 이미지가 없습니다", !1);
      return;
    }
    try {
      const res = await K("/v1/gallery/export", { method: "POST", body }, 12e4);
      if (!res?.ok) throw new Error(res?.error?.message || "내보내기 실패");
      downloadBase64Zip(res.zip_base64, res.filename);
      $e(`ZIP 내보내기 · ${res.count}장`);
    } catch (err) {
      t.uiMessage = { type: "error", text: z(err?.message || err) }, await P();
    }
  }
  async function explorerImportFile(file) {
    if (!file) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i += 1) binary += String.fromCharCode(buf[i]);
    try {
      const res = await K("/v1/gallery/import", {
        method: "POST",
        body: { zip_base64: btoa(binary), prefer_new_ids: !0 }
      }, 12e4);
      if (!res?.ok) throw new Error(res?.error?.message || "불러오기 실패");
      const r = res.report || {};
      $e(`불러오기 ${res.imported}장 · 정확 ${r.exact || 0}/후보 ${r.candidate || 0}/고아 ${r.orphan || 0}`);
      await Et(!0), await P();
    } catch (err) {
      t.uiMessage = { type: "error", text: z(err?.message || err) }, await P();
    }
  }
  async function explorerDeleteSelected() {
    const ids = [...ensureExplorerState().selection?.selected || []];
    if (!ids.length || !confirm(`${ids.length}장을 삭제할까요?`)) return;
    try {
      await K("/v1/gallery/delete", { method: "POST", body: { card_ids: ids } }), await Et(!0), await P();
    } catch (err) {
      t.uiMessage = { type: "error", text: z(err?.message || err) }, await P();
    }
  }
  async function explorerToggleFavorite(id) {
    const ex = ensureExplorerState(), set = new Set(ex.favorites || []);
    set.has(id) ? set.delete(id) : set.add(id);
    ex.favorites = [...set];
    try {
      await K("/v1/gallery/favorites", { method: "POST", body: { ids: ex.favorites } });
    } catch {
    }
    const on = set.has(id);
    const btn = document.querySelector(`[data-explorer-id="${CSS.escape?.(id) || id.replace(/"/g, "")}"] [data-explorer-star]`);
    if (btn) {
      btn.textContent = on ? "★" : "☆";
      btn.classList.toggle("is-on", on);
    }
    const lbFav = document.getElementById("nx-lb-fav");
    const lbOpen = document.getElementById("nx-explorer-lightbox")?.classList.contains("show");
    if (lbFav && lbOpen) {
      const card = Ze().items[t.explorer.lbIndex || 0];
      if (card && card.id === id) {
        lbFav.textContent = on ? "★ 즐겨찾기" : "☆ 즐겨찾기";
        lbFav.classList.toggle("active", on);
      }
    }
    if (ex.favOnly) {
      const { items: r } = Ze(), grid = document.querySelector(".explorer-grid");
      grid && (grid.innerHTML = `<div class="explorer-marquee" id="nx-explorer-marquee"></div>${et(r)}`), paintExplorerSelectionUi(), tt();
    }
  }
  function openExplorerLightbox(id) {
    const { items } = Ze();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) return;
    t.explorer.lbIndex = idx;
    const lb = document.getElementById("nx-explorer-lightbox");
    if (!lb) return;
    const paint = () => {
      const list = Ze().items, i = Math.max(0, Math.min(list.length - 1, t.explorer.lbIndex || 0));
      t.explorer.lbIndex = i;
      const card = list[i];
      if (!card) return;
      const img = lb.querySelector("img");
      const meta = lb.querySelector("[data-lb-meta]");
      const favBtn = document.getElementById("nx-lb-fav");
      const favOn = (ensureExplorerState().favorites || []).includes(card.id);
      img && (img.src = Ie(card), img.style.transform = `translate(${t.explorer.lbPanX || 0}px,${t.explorer.lbPanY || 0}px) scale(${t.explorer.lbZoom || 1})`);
      meta && (meta.textContent = `${i + 1}/${list.length} · msg #${Number(card.message_index) >= 0 ? card.message_index + 1 : "?"} · shot ${Number(card.shot_index) + 1}`);
      if (favBtn) {
        favBtn.textContent = favOn ? "★ 즐겨찾기" : "☆ 즐겨찾기";
        favBtn.classList.toggle("active", favOn);
      }
    };
    t.explorer.lbZoom = 1, t.explorer.lbPanX = 0, t.explorer.lbPanY = 0;
    lb.classList.add("show"), paint(), t._explorerLbPaint = paint;
  }
  function closeExplorerLightbox() {
    document.getElementById("nx-explorer-lightbox")?.classList.remove("show");
    t._explorerLbPaint = null;
  }
  async function explorerJumpToMessage(card) {
    if (!card) return;
    try {
      await pt(card);
      $e("원문 메시지로 이동");
    } catch (err) {
      $e(z(err?.message || "메시지 이동 실패"), !1);
    }
  }
  function hideExplorerCtx() {
    const ctx = document.getElementById("nx-explorer-ctx");
    ctx && (ctx.style.display = "none");
  }
  function showExplorerCtx(x, y, id) {
    const ctx = document.getElementById("nx-explorer-ctx");
    if (!ctx) return;
    ctx.dataset.id = id || "";
    ctx.style.display = "block";
    ctx.style.left = `${Math.min(window.innerWidth - 200, x)}px`;
    ctx.style.top = `${Math.min(window.innerHeight - 220, y)}px`;
  }
  function tt() {
    const e = document.getElementById("nx-explorer-tip");
    const grid = document.querySelector(".explorer-grid");
    const EX = exHelpers();
    document.querySelectorAll("[data-explorer-id]").forEach((n) => {
      if (n.dataset.nxBound) return;
      n.dataset.nxBound = "1";
      n.addEventListener("mouseenter", (a) => {
        e && (e.style.display = "block", e.textContent = n.getAttribute("data-tip") || "", e.style.left = `${Math.min(window.innerWidth - 300, a.clientX + 14)}px`, e.style.top = `${Math.min(window.innerHeight - 120, a.clientY + 14)}px`);
      }), n.addEventListener("mousemove", (a) => {
        !e || e.style.display === "none" || (e.style.left = `${Math.min(window.innerWidth - 300, a.clientX + 14)}px`, e.style.top = `${Math.min(window.innerHeight - 120, a.clientY + 14)}px`);
      }), n.addEventListener("mouseleave", () => {
        e && (e.style.display = "none");
      });
      n.addEventListener("click", (r) => {
        if (r.target?.closest?.("[data-explorer-star]")) return;
        r.preventDefault(), r.stopPropagation();
        const id = n.getAttribute("data-explorer-id"), { items } = Ze(), ids = items.map((x) => x.id), index = ids.indexOf(id);
        const ex = ensureExplorerState();
        const mobile = !!ex.mobileSelect;
        ex.selection = EX.applyExplorerClick ? EX.applyExplorerClick(ex.selection, id, {
          ids,
          index,
          shift: !!r.shiftKey,
          ctrl: !!(r.ctrlKey || r.metaKey || mobile)
        }) : ex.selection;
        paintExplorerSelectionUi();
      });
      n.addEventListener("dblclick", async (r) => {
        r.preventDefault(), r.stopPropagation();
        openExplorerLightbox(n.getAttribute("data-explorer-id"));
      });
      n.addEventListener("contextmenu", (r) => {
        r.preventDefault(), r.stopPropagation();
        const id = n.getAttribute("data-explorer-id"), ex = ensureExplorerState();
        if (!ex.selection?.selected?.has(id)) {
          const { items } = Ze(), ids = items.map((x) => x.id);
          ex.selection = EX.applyExplorerClick ? EX.applyExplorerClick(ex.selection, id, { ids, index: ids.indexOf(id) }) : ex.selection;
          paintExplorerSelectionUi();
        }
        showExplorerCtx(r.clientX, r.clientY, id);
      });
      let pressTimer = 0;
      n.addEventListener("pointerdown", (r) => {
        if (r.pointerType === "touch") {
          pressTimer = setTimeout(() => {
            ensureExplorerState().mobileSelect = !0;
            n.click();
            paintExplorerSelectionUi();
          }, 480);
        }
      });
      n.addEventListener("pointerup", () => clearTimeout(pressTimer));
      n.addEventListener("pointercancel", () => clearTimeout(pressTimer));
      n.querySelector("[data-explorer-star]")?.addEventListener("click", async (r) => {
        r.preventDefault(), r.stopPropagation();
        await explorerToggleFavorite(n.getAttribute("data-explorer-id"));
      });
    });
    if (grid && !grid.dataset.nxMarquee) {
      grid.dataset.nxMarquee = "1";
      const box = () => document.getElementById("nx-explorer-marquee");
      let drag = null;
      grid.addEventListener("pointerdown", (ev) => {
        if (ev.target?.closest?.("[data-explorer-id],button,input,select")) return;
        if (ev.button !== 0) return;
        const rect = grid.getBoundingClientRect();
        drag = { x0: ev.clientX - rect.left + grid.scrollLeft, y0: ev.clientY - rect.top + grid.scrollTop, additive: !!(ev.ctrlKey || ev.metaKey) };
        const m = box();
        m && (m.style.display = "block", m.style.left = `${drag.x0}px`, m.style.top = `${drag.y0}px`, m.style.width = "0px", m.style.height = "0px");
        grid.setPointerCapture?.(ev.pointerId);
      });
      grid.addEventListener("pointermove", (ev) => {
        if (!drag) return;
        const rect = grid.getBoundingClientRect();
        const x1 = ev.clientX - rect.left + grid.scrollLeft, y1 = ev.clientY - rect.top + grid.scrollTop;
        const left = Math.min(drag.x0, x1), top = Math.min(drag.y0, y1), w = Math.abs(x1 - drag.x0), h = Math.abs(y1 - drag.y0);
        const m = box();
        m && (m.style.left = `${left}px`, m.style.top = `${top}px`, m.style.width = `${w}px`, m.style.height = `${h}px`);
      });
      const endDrag = (ev) => {
        if (!drag) return;
        const rect = grid.getBoundingClientRect();
        const x1 = (ev?.clientX ?? drag.x0) - rect.left + grid.scrollLeft, y1 = (ev?.clientY ?? drag.y0) - rect.top + grid.scrollTop;
        const left = Math.min(drag.x0, x1), top = Math.min(drag.y0, y1), right = Math.max(drag.x0, x1), bottom = Math.max(drag.y0, y1);
        const ex = ensureExplorerState();
        const next = drag.additive ? new Set(ex.selection.selected) : new Set();
        grid.querySelectorAll("[data-explorer-id]").forEach((card) => {
          const cr = card.getBoundingClientRect();
          const cl = cr.left - rect.left + grid.scrollLeft, ct = cr.top - rect.top + grid.scrollTop;
          const cRight = cl + cr.width, cBottom = ct + cr.height;
          if (cl < right && cRight > left && ct < bottom && cBottom > top) next.add(card.getAttribute("data-explorer-id"));
        });
        ex.selection.selected = next;
        if (next.size) ex.selection.focusId = [...next][0];
        drag = null;
        const m = box();
        m && (m.style.display = "none");
        paintExplorerSelectionUi();
      };
      grid.addEventListener("pointerup", endDrag);
      grid.addEventListener("pointercancel", () => {
        drag = null;
        const m = box();
        m && (m.style.display = "none");
      });
    }
  }
  function ma() {
    const EX = exHelpers();
    const { ex: e, folders: n, folderKey: o, items: a } = Ze();
    const thumb = EX.thumbMinWidth ? EX.thumbMinWidth(e.thumb || "m") : 148;
    const selCount = e.selection?.selected?.size || 0;
    const totalCount = (e.items || []).length;
    const folderButtons = `
          <button type="button" class="explorer-folder ${o === "__all__" ? "active" : ""}" data-explorer-folder="__all__">
            <strong>통합 이미지보기</strong>
            <span>모든 캐릭터·채팅 · ${totalCount}장</span>
          </button>${n.map((r) => `
          <button type="button" class="explorer-folder ${r.key === o ? "active" : ""}" data-explorer-folder="${h(r.key)}">
            <strong>${h(r.character_name || "Unknown")}</strong>
            <span>${h(r.chat_name || "")} · ${Number(r.count) || 0}장</span>
          </button>`).join("")}`;
    return `
      <div class="explorer-layout">
        <aside class="explorer-side">
          <div class="explorer-side-head">
            <strong style="font-size:13px">캐릭터 챗</strong>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" id="nx-explorer-refresh" class="secondary" style="min-height:30px;padding:4px 10px">새로고침</button>
              <button type="button" id="nx-explorer-delete-folder" style="min-height:30px;padding:4px 10px">폴더 삭제</button>
            </div>
          </div>
          <div class="explorer-folders" id="nx-explorer-folders">${folderButtons}</div>
        </aside>
        <section class="explorer-main">
          <div class="explorer-main-head">
            <div class="explorer-toolbar" style="flex:1">
              <input id="nx-explorer-q" placeholder="검색: 캐릭터/채팅/프리뷰" value="${h(e.query || "")}" style="flex:1;min-width:140px">
              <select id="nx-explorer-sort" style="min-height:34px;border-radius:10px;border:1px solid var(--border2);background:rgba(7,10,17,.7);color:var(--text);padding:4px 8px">
                <option value="newest" ${e.sort === "newest" ? "selected" : ""}>최신</option>
                <option value="oldest" ${e.sort === "oldest" ? "selected" : ""}>오래된</option>
                <option value="message" ${e.sort === "message" ? "selected" : ""}>메시지순</option>
                <option value="shot" ${e.sort === "shot" ? "selected" : ""}>샷순</option>
              </select>
              <select id="nx-explorer-thumb" style="min-height:34px;border-radius:10px;border:1px solid var(--border2);background:rgba(7,10,17,.7);color:var(--text);padding:4px 8px">
                <option value="s" ${e.thumb === "s" ? "selected" : ""}>작게</option>
                <option value="m" ${e.thumb === "m" ? "selected" : ""}>보통</option>
                <option value="l" ${e.thumb === "l" ? "selected" : ""}>크게</option>
              </select>
              <button type="button" id="nx-explorer-export-folder" class="secondary" style="min-height:30px;padding:4px 10px">폴더 ZIP</button>
              <button type="button" id="nx-explorer-export-all" class="secondary" style="min-height:30px;padding:4px 10px">전체 ZIP</button>
              <button type="button" id="nx-explorer-import" class="secondary" style="min-height:30px;padding:4px 10px">ZIP 불러오기</button>
              <input id="nx-explorer-import-file" type="file" accept=".zip,application/zip" style="display:none">
              <span class="muted" style="font-size:12px">${a.length}장</span>
            </div>
          </div>
          <div id="nx-explorer-selbar" class="explorer-selbar">
            <strong data-ex-selcount style="font-size:12px">${selCount ? `${selCount}장 선택` : "선택 없음"}</strong>
            <button type="button" id="nx-explorer-mobile-select" class="secondary ex-mobile-select ${e.mobileSelect ? "active" : ""}" style="min-height:28px;padding:4px 10px" title="터치에서 탭할 때마다 선택 토글">선택모드</button>
            <button type="button" id="nx-explorer-export-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택 ZIP</button>
            <button type="button" id="nx-explorer-save-one" class="secondary" style="min-height:28px;padding:4px 10px">단건 저장</button>
            <button type="button" id="nx-explorer-favonly" class="secondary ex-mobile-select ${e.favOnly ? "active" : ""}" style="min-height:28px;padding:4px 10px" title="별 표시한 이미지만 보기">${e.favOnly ? "★ 즐겨찾기만" : "☆ 즐겨찾기만"}</button>
            <button type="button" id="nx-explorer-delete-sel" style="min-height:28px;padding:4px 10px">삭제</button>
            <button type="button" id="nx-explorer-clear-sel" class="secondary" style="min-height:28px;padding:4px 10px">선택 해제</button>
          </div>
          <div class="explorer-grid" style="--ex-thumb:${thumb}px"><div class="explorer-marquee" id="nx-explorer-marquee"></div>${et(a)}</div>
        </section>
      </div>
      <div class="notice info" style="margin-top:12px">클릭=선택 · Shift 범위 · Ctrl/⌘ 토글 · 더블클릭=크게보기 · 드래그=박스선택 · Del=삭제 · ZIP에 manifest 포함(불러오기 시 content_hash 재부착).</div>
      <div id="nx-explorer-ctx" class="explorer-ctx">
        <button type="button" data-ex-act="view">크게보기</button>
        <button type="button" data-ex-act="jump">원문 메시지로</button>
        <button type="button" data-ex-act="save">이미지 저장</button>
        <button type="button" data-ex-act="zip">선택 ZIP</button>
        <button type="button" data-ex-act="star">즐겨찾기</button>
        <button type="button" data-ex-act="delete">삭제</button>
      </div>
      <div id="nx-explorer-lightbox" class="explorer-lightbox" data-lb-backdrop>
        <div class="lb-stage" data-lb-backdrop><img alt="크게보기"></div>
        <div class="lb-bar">
          <button type="button" id="nx-lb-prev" class="secondary">◀</button>
          <span data-lb-meta class="muted" style="font-size:12px"></span>
          <button type="button" id="nx-lb-next" class="secondary">▶</button>
          <button type="button" id="nx-lb-fav" class="secondary ex-mobile-select">☆ 즐겨찾기</button>
          <button type="button" id="nx-lb-close">닫기</button>
        </div>
      </div>`;
  }
  function $e(e, n = !0) {
    const o = document.getElementById("nx-save-flash");
    o && (o.style.color = n ? "var(--ok)" : "var(--err)", o.textContent = e, clearTimeout(t._saveFlashTimer), t._saveFlashTimer = setTimeout(() => {
      o.textContent === e && (o.textContent = "");
    }, 1800));
  }
  function Mt() {
    return document.getElementById("nx-power") ? {
      power: ee("nx-power"),
      execute: N("nx-execute"),
      gallery_fab: !1,
      floating_viewer: ee("nx-floating-viewer"),
      overlay_markers: ee("nx-overlay"),
      llm_anchor_percent: ee("nx-llm-anchor"),
      inline_previews: ee("nx-overlay"),
      overlay_hide_offscreen: ee("nx-hide-offscreen"),
      scroll_message_track: ee("nx-scroll-track"),
      click_message_track: ee("nx-click-track"),
      message_select_gesture: N("nx-select-gesture") === "double" ? "double" : "single",
      text_drag_select: ee("nx-text-drag"),
      mobile_toggle_pin: ee("nx-mobile-pin"),
      hover_preview: ee("nx-hover-preview"),
      show_risu_settings_button: ee("nx-risu-settings-button"),
      debug_panel: ee("nx-debug-panel"),
      generate_all_roles: ee("nx-gen-all-roles"),
      auto_gen_on_reply: ee("nx-auto-gen-reply"),
      lorebook: ee("nx-lore"),
      unified_chat_priority: ee("nx-unified-priority"),
      char_info: ee("nx-charinfo"),
      user_info: ee("nx-userinfo"),
      char_appearance: ee("nx-appearance"),
      inline_thumb_pct: Math.max(1, Ne(N("nx-inline-pct"), 100)),
      overlay_x_pct: Math.max(0, Math.min(100, Math.floor(Ne(N("nx-overlay-x"), pinXPctDefault)))),
      overlay_y_pct: Math.max(0, Math.min(100, Math.floor(Ne(N("nx-overlay-y"), pinYPctDefault)))),
      overlay_pin_unit: "pct",
      overlay_pin_origin: "bl",
      hover_preview_anchor: Bt(N("nx-hover-anchor")),
      hover_preview_corner: Ut(N("nx-hover-corner")),
      viewer_minimize_mode: N("nx-minimize-mode") === "toolbar" ? "toolbar" : "icon"
    } : null;
  }
  function Ct() {
    if (!document.getElementById("nx-mode") && !document.getElementById("nx-char-max")) return null;
    const e = document.getElementById("nx-custom-pos") ? _e() : t.backendSettings?.card || {}, n = re(N("nx-char-max") || e.character_max || 6, 1, 6, 6);
    return {
      mode: N("nx-mode") || e.mode || "illustration",
      image_min: Number(N("nx-min") || e.image_min || 1),
      image_max: Number(N("nx-max") || e.image_max || 3),
      character_max: n,
      include_max: Number(N("nx-include-max") || e.include_max || 0),
      person_tag_weight: document.getElementById("nx-person-tag-weight") ? re(N("nx-person-tag-weight"), 0, 5, re(e.person_tag_weight, 0, 5, 3)) : re(e.person_tag_weight, 0, 5, 3),
      preprocessing: document.getElementById("nx-preprocess") ? ee("nx-preprocess") : !!e.preprocessing,
      person_tag_mode: N("nx-person-tag-mode") || e.person_tag_mode || "gender",
      auto_person_tags: (N("nx-person-tag-mode") || e.person_tag_mode || "gender") !== "off",
      lore_extra: document.getElementById("nx-lore-extra") ? normalizeLoreExtraMode(N("nx-lore-extra")) : normalizeLoreExtraMode(e.lore_extra),
      natural_base: document.getElementById("nx-natural-base") ? N("nx-natural-base") || "short" : e.natural_base || "short",
      presets: e.presets || [],
      active_preset_id: e.active_preset_id || "",
      custom_pos: e.custom_pos || "",
      custom_neg: e.custom_neg || ""
    };
  }
  async function xa() {
    try {
      await flushSettingsSave();
      const e = {}, n = Mt(), o = Ct();
      if ((n || o) && (e.card = {
        ...t.backendSettings?.card || {},
        ...n || {},
        ...o || {}
      }), document.getElementById("nx-llm-model") || document.getElementById("nx-nai-model")) {
        const a = ba();
        a && (e.llm = a.llm, e.nai = a.nai);
      }
      if (Object.keys(e).length && await pe(e), t.uiTab === "characters" && await K("/v1/characters", {
        method: "POST",
        body: withRootSessions({
          session_id: (await Z()).sessionId,
          character_id: w(t.lastScope?.characterId || "", 200),
          characters: oe("session"),
          global: oe("global")
        }, t.lastScope)
      }).then((res) => {
        if (Array.isArray(res?.characters)) t.charactersSession = res.characters;
        if (Array.isArray(res?.global)) t.charactersGlobal = res.global;
        if (res?.appearance) t.appearance = res.appearance;
        t._charsDirty = !1;
      }), t.uiTab === "prompts") for (const a of t.prompts || []) {
        const r = document.getElementById(`nx-prompt-${a.key}`);
        if (!r) continue;
        const i = r.value || "";
        t.promptDrafts[a.key] = i, await K(`/v1/prompts/${encodeURIComponent(a.key)}`, {
          method: "PUT",
          body: { text: i }
        });
      }
      t.uiMessage = {
        type: "success",
        text: "전체 저장됨"
      }, $e("저장됨");
    } catch (e) {
      $e("저장 실패", !1), t.uiMessage = {
        type: "error",
        text: z(e?.message || e)
      };
    }
    await P();
  }
  function Oe() {
    const e = {
      source: N("nx-llm-source") || "custom",
      provider: N("nx-llm-provider"),
      model: N("nx-llm-model"),
      endpoint: N("nx-llm-endpoint"),
      temperature: Number(N("nx-llm-temp") || 0.4),
      max_tokens: Number(N("nx-llm-max") || 8e3),
      reasoning_effort: N("nx-llm-reasoning") || "default",
      vertex_region: N("nx-llm-vertex-region") || "us-central1",
      anthropic_version: N("nx-llm-anthropic-version") || "2023-06-01"
    }, n = N("nx-llm-key");
    n && (e.api_key = n);
    const sa = N("nx-llm-service-account");
    sa && (e.service_account_json = sa);
    if (ee("nx-llm-clear-sa")) e.clearServiceAccount = !0;
    const hasEl = (id) => !!document.getElementById(id);
    const o = {
      backend: N("nx-img-backend") || "nai",
      provider: hasEl("nx-nai-provider") ? N("nx-nai-provider") : void 0,
      model: hasEl("nx-nai-model") ? N("nx-nai-model") : void 0,
      request_url: hasEl("nx-nai-url") ? N("nx-nai-url") : void 0,
      width: hasEl("nx-nai-w") ? Number(N("nx-nai-w") || 832) : void 0,
      height: hasEl("nx-nai-h") ? Number(N("nx-nai-h") || 1216) : void 0,
      sampler: hasEl("nx-nai-sampler") ? N("nx-nai-sampler") : void 0,
      scheduler: hasEl("nx-nai-sched") ? N("nx-nai-sched") : void 0,
      steps: hasEl("nx-nai-steps") ? Number(N("nx-nai-steps") || 28) : void 0,
      cfg_scale: hasEl("nx-nai-cfg") ? Number(N("nx-nai-cfg") || 7) : void 0,
      cfg_rescale: hasEl("nx-nai-rescale") ? Number(N("nx-nai-rescale") || 0.36) : void 0,
      image_reference: hasEl("nx-nai-ref") ? N("nx-nai-ref") || "none" : void 0,
      image_reference_strength: hasEl("nx-nai-ref-strength") ? Number(N("nx-nai-ref-strength") || 0.6) : void 0,
      image_reference_fidelity: hasEl("nx-nai-ref-fidelity") ? Number(N("nx-nai-ref-fidelity") || 1) : void 0,
      image_reference_type: hasEl("nx-nai-ref-type") ? N("nx-nai-ref-type") || "character&style" : void 0,
      vibe_transfer: hasEl("nx-nai-vibe") ? N("nx-nai-vibe") || "none" : void 0,
      vibe_transfer_strength: hasEl("nx-nai-vibe-strength") ? Number(N("nx-nai-vibe-strength") || 0.6) : void 0,
      vibe_transfer_information_extracted: hasEl("nx-nai-vibe-ie") ? Number(N("nx-nai-vibe-ie") || 1) : void 0,
      variety_plus: hasEl("nx-nai-var") ? ee("nx-nai-var") : void 0,
      enable_i2i: hasEl("nx-nai-i2i") ? ee("nx-nai-i2i") : void 0,
      apply_quality_tags: hasEl("nx-nai-quality") ? ee("nx-nai-quality") : void 0,
      comfy_url: hasEl("nx-comfy-url") ? N("nx-comfy-url") : void 0,
      comfy_workflow_json: hasEl("nx-comfy-workflow") ? N("nx-comfy-workflow") : void 0,
      backend_timeout_seconds: hasEl("nx-backend-timeout") ? Number(N("nx-backend-timeout") || 300) : void 0
    };
    for (const k of Object.keys(o)) if (o[k] === void 0) delete o[k];
    const a = hasEl("nx-nai-key") ? N("nx-nai-key") : "";
    return a && (o.api_key = a), {
      llm: e,
      nai: o
    };
  }
  function ba() {
    return !document.getElementById("nx-llm-model") && !document.getElementById("nx-nai-model") && !document.getElementById("nx-img-backend") ? null : Oe();
  }
  async function Lt(e, n) {
    const o = (r, i = "pending") => {
      n && (n.className = `autotag-status muted ${i}`, n.textContent = r);
    };
    o("로딩중… 연결 LLM에 이미지 전송", "pending");
    let a;
    try {
      a = await K("/v1/autotag", {
        method: "POST",
        body: {
          image_b64: await It(e),
          threshold: t.autotagThreshold || 0.2
        }
      }, 18e4);
    } catch (err) {
      throw new Error(err?.data?.error?.message || err?.message || err || "오토태그 실패");
    }
    if (!a?.ok && !a?.appearance && !a?.attire && !a?.accessories && !a?.text) {
      throw new Error(a?.error?.message || a?.message || "태그 없음");
    }
    const appearance = w(a.appearance || "", 4e3);
    const attire = w(a.attire || "", 4e3);
    const accessories = w(a.accessories || "", 4e3);
    const text = w(a.text || [appearance, attire, accessories].filter(Boolean).join(", ") || (a.tags || []).join(", "), 8e3);
    const count = a.count || (a.tags || []).length || [appearance, attire, accessories].filter(Boolean).length;
    const genderRaw = String(a.gender || "").toLowerCase();
    const gender = ["girl", "female", "f", "woman"].includes(genderRaw) ? "girl" : ["boy", "male", "m", "man"].includes(genderRaw) ? "boy" : ["other"].includes(genderRaw) ? "other" : "";
    return o(`LLM 태그 완료 · 외형/의상/악세 ${count ? `${count}토큰` : "반영"}${gender ? ` · ${gender}` : ""}`, "ok"), {
      appearance: appearance || (!attire && !accessories ? text : ""),
      attire,
      accessories,
      gender,
      text,
      count
    };
  }
  async function Tt(e, n) {
    if (!e) return;
    Qe(e, { open: !0 });
    const o = e.querySelector("[data-autotag-status]"), a = e.querySelector("[data-autotag-badge]"), r = e.querySelector("[data-char-autotag]");
    const appEl = e.querySelector("[data-char-appearance]"), attEl = e.querySelector("[data-char-attire]"), accEl = e.querySelector("[data-char-accessories]");
    a && (a.classList.add("show"), a.textContent = "분석 중…"), r && (r.classList.add("armed"), r.textContent = "분석 중…");
    try {
      const s = await Lt(n, o);
      if (appEl) appEl.value = s.appearance || "";
      if (attEl) attEl.value = s.attire || "";
      if (accEl) accEl.value = s.accessories || "";
      a && (a.textContent = "완료"), r && (r.textContent = "오토태그");
    } catch (s) {
      o && (o.className = "autotag-status muted err", o.textContent = `실패: ${z(s?.message || s, 80)}`), a && (a.textContent = "실패"), r && (r.textContent = "붙여넣기 대기");
    }
  }

  async function withImageRerollToast(e, n, opts = {}) {
    const o = String(e || "이미지 리롤 중…");
    const shotCount = Math.max(1, Math.floor(Number(opts.shotCount) || 1));
    t.jobProgress = {
      state: "generating",
      message: o,
      progress: 12,
      shot_index: 0,
      shot_count: shotCount,
      shot_done: 0,
      jobId: "reroll",
      kind: "reroll"
    }, await Se();
    const a = setInterval(() => {
      if (!t.jobProgress || t.jobProgress.jobId !== "reroll") return;
      const r = Number(t.jobProgress.progress) || 12;
      r < 88 && (t.jobProgress = {
        ...t.jobProgress,
        progress: Math.min(88, r + 4)
      }, Se().catch(() => {
      }));
    }, 900);
    try {
      const r = await n((patch) => {
        if (!t.jobProgress || t.jobProgress.jobId !== "reroll") return;
        t.jobProgress = { ...t.jobProgress, ...patch };
        Se().catch(() => {
        });
      });
      return clearInterval(a), t.jobProgress = {
        state: "done",
        message: "리롤 완료",
        progress: 100,
        shot_index: shotCount,
        shot_count: shotCount,
        shot_done: shotCount,
        jobId: "reroll",
        kind: "reroll"
      }, await Se(), setTimeout(() => {
        t.jobProgress?.jobId === "reroll" && (t.jobProgress = null, Se().catch(() => {
        }));
      }, 1800), r;
    } catch (r) {
      throw clearInterval(a), t.jobProgress = {
        state: "error",
        message: z(r?.message || r, 120),
        progress: 100,
        shot_index: 0,
        shot_count: shotCount,
        shot_done: 0,
        jobId: "reroll",
        kind: "reroll"
      }, await Se(), r;
    }
  }

  function messageCardsByY(msg) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const all = Array.isArray(t.gallery) ? t.gallery : [];
    if (!msg) return [];
    if (typeof VC?.galleryForMessage == "function") {
      const ordered = VC.galleryForMessage(all, msg, 0);
      const n = typeof VC.gallerySelectedCount == "function" ? VC.gallerySelectedCount(all, msg) : ordered.length;
      return ordered.slice(0, Math.max(0, n));
    }
    const yOf = (c) => {
      const n = Number(c?.y_percent ?? c?.anchor_percent ?? c?.read_percent);
      return Number.isFinite(n) ? n : 999;
    };
    return all
      .filter((c) => c?.content_hash && c.content_hash === msg.hash)
      .sort((a, b) => yOf(a) - yOf(b) || Number(a.shot_index || 0) - Number(b.shot_index || 0));
  }

  /** Reroll each message image in y% order; refresh gallery after every shot. */
  async function rerollMessageImagesLive(msg, opts = {}) {
    const scope = opts.scope || await Z({ useOverride: !1 }).catch(() => null);
    const sessionId = msg?.sessionId || scope?.sessionId || "";
    let targets = messageCardsByY(msg);
    if (!targets.length) throw new Error("재생성할 이미지 없음");
    const total = targets.length;
    const cards = [], replaced = [], failed = [];
    const report = typeof opts.report == "function" ? opts.report : () => {
    };
    const onShot = typeof opts.onShot == "function" ? opts.onShot : null;
    for (let i = 0; i < total; i += 1) {
      // Re-resolve left strip each time — card ids change after each replace.
      if (sessionId) await ce(sessionId, !0);
      targets = messageCardsByY(msg);
      const current = targets[i];
      if (!current?.id) {
        failed.push({ id: "", error: `slot ${i + 1} missing` });
        continue;
      }
      report({
        message: `${i + 1}/${total} 이미지 재생성 중…`,
        progress: Math.max(8, Math.min(92, Math.round(i / total * 90))),
        shot_index: i,
        shot_count: total,
        shot_done: i
      });
      try {
        const result = await K(`/v1/cards/${encodeURIComponent(current.id)}/reroll`, {
          method: "POST",
          body: { mode: "nai" }
        }, 18e4);
        if (result?.busy || result?.error?.code === "busy") {
          failed.push({ id: current.id, error: result?.error?.message || "busy" });
          break;
        }
        if (result?.ok && result.card) {
          cards.push(result.card);
          if (result.replaced) replaced.push(result.replaced);
        } else {
          failed.push({ id: current.id, error: result?.error?.message || "reroll failed" });
          continue;
        }
        if (sessionId) await ce(sessionId, !0);
        try {
          await he();
        } catch {
        }
        report({
          message: `${i + 1}/${total} 완료`,
          progress: Math.max(12, Math.min(96, Math.round((i + 1) / total * 95))),
          shot_index: i + 1,
          shot_count: total,
          shot_done: i + 1
        });
        if (onShot) await onShot(i, result, total);
        else if (t.galleryUi?.renderGal) await t.galleryUi.renderGal();
      } catch (err) {
        failed.push({ id: current.id, error: z(err?.message || err, 400) });
      }
    }
    if (!cards.length) throw new Error(failed[0]?.error || "전체 재생성 실패");
    return { ok: !0, count: cards.length, replaced, cards, failed };
  }

  async function dismissProgressToast() {
    t.jobProgress = null;
    try {
      await Se();
    } catch {
    }
  }
  async function Se() {
    try {
      if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
    } catch {
    }
  }
  async function ya() {
    return null;
  }
  async function P() {
    if (!t.uiOpen || typeof document > "u") return;
    if (t.charEditUi?.root) {
      if (t.charEditUi.root.isConnected) return;
      t.charEditUi = null;
    }
    t._uiRendering = !0;
    try {
    const e = ++t.uiRenderGen;
    let n = t.settings || {
      backendUrl: "http://127.0.0.1:28120",
      enabled: !0
    };
    ve().catch(() => {
    });
    let o = "";
    t.backendSettings ? le().catch(() => {
    }) : le().then(() => {
      t.uiOpen && e === t.uiRenderGen && P();
    }).catch((d) => {
      t.uiMessage = {
        type: "error",
        text: z(d?.message || d)
      }, t.uiOpen && e === t.uiRenderGen && P();
    });
    if (t.uiTab === "prompts" && (!(t.prompts || []).length && !t._promptsLoading ? (t._promptsLoading = !0, Je().catch((d) => {
      t.uiMessage = {
        type: "error",
        text: z(d?.message || d)
      };
    }).finally(() => {
      t._promptsLoading = !1, t.uiOpen && t.uiTab === "prompts" && P().catch(() => {
      });
    })) : Je().catch(() => {
    })), t.uiTab === "characters" && !t._charsBgRefresh) {
      const d = e, U = () => JSON.stringify({
        s: t.charactersSession || [],
        g: t.charactersGlobal || []
      }), f = U();
      t._charsBgRefresh = !0, (async () => {
        try {
          const x = t.lastScope || await Z();
          // Keep unsaved draft rows (new_/gnew_/tmp_) — ce() reloads from API and would wipe them.
          const isDraft = (c) => {
            const id = String(c?.id || "");
            return id.startsWith("new_") || id.startsWith("gnew_") || id.startsWith("tmp_");
          };
          const mergeDrafts = (serverList, localList) => {
            const server = Array.isArray(serverList) ? serverList : [];
            const ids = new Set(server.map((c) => String(c?.id || "")));
            const extras = (Array.isArray(localList) ? localList : []).filter((c) => isDraft(c) && !ids.has(String(c?.id || "")));
            return extras.length ? [...server, ...extras] : server;
          };
          const localSession = [...(t.charactersSession || [])];
          const localGlobal = [...(t.charactersGlobal || [])];
          await ce(x?.sessionId);
          // Unsaved add/delete edits must not be overwritten by the background reload.
          if (t._charsDirty) {
            t.charactersSession = localSession;
            t.charactersGlobal = localGlobal;
            return;
          }
          t.gallerySessionId = x?.sessionId || "";
          t.charactersSession = mergeDrafts(t.charactersSession, localSession);
          t.charactersGlobal = mergeDrafts(t.charactersGlobal, localGlobal);
          if (f === U() || d !== t.uiRenderGen || !t.uiOpen || t.uiTab !== "characters" || t.charEditUi?.root?.isConnected) return;
          await P();
        } catch {
        } finally {
          t._charsBgRefresh = !1;
        }
      })();
    }
    if (t.uiTab === "explorer" && !t._explorerLoading) {
      const d = !!((t.explorer?.items || []).length || (t.explorer?.folders || []).length);
      t._explorerLoading = !0, Et(!1).then((U) => {
        if (!t.uiOpen || t.uiTab !== "explorer") return;
        const f = !!((U?.items || []).length || (U?.folders || []).length);
        !d && f && P().catch(() => {
        });
      }).catch(() => {
      }).finally(() => {
        t._explorerLoading = !1;
      });
    }
    if (e !== t.uiRenderGen) return;
    let a = t.health ? {
      ok: !0,
      health: t.health
    } : {
      ok: !1,
      error: "확인 중…"
    };
    bt().then((d) => {
      if (!(e !== t.uiRenderGen || !t.uiOpen))
        try {
          const U = document.querySelectorAll(".grid > .card .value");
          U[0] && (U[0].textContent = d.ok ? `연결됨 · v${d.health?.version || "?"}` : `연결 실패 · ${d.error || "unknown"}`);
        } catch {
        }
    }).catch(() => {
    });
    const r = t.backendSettings || {}, i = r.card || {}, s = r.nai || {}, c = r.llm || {}, l = a.ok ? `연결됨 · v${h(a.health?.version || "?")}` : a.error ? `연결 실패 · ${h(a.error)}` : "확인 중…", p = t.uiMessage;
    const VCPin = globalThis.__INLAY_VIEWER_CORE__, vwUi = typeof window < "u" && window.innerWidth || 1200, vhUi = typeof window < "u" && window.innerHeight || 800;
    const pinUiX = typeof VCPin?.resolveStoredPinPercent == "function" ? VCPin.resolveStoredPinPercent(i, "x", vwUi, { x: pinXPctDefault, y: pinYPctDefault }) : Ne(i.overlay_x_pct, pinXPctDefault);
    const pinUiY = typeof VCPin?.resolveStoredPinPercent == "function" ? VCPin.resolveStoredPinPercent(i, "y", vhUi, { x: pinXPctDefault, y: pinYPctDefault }) : Ne(i.overlay_y_pct, pinYPctDefault);
    let m = t.lastScope;
    let u = "";
    if (t.uiTab === "dashboard") u = `
        <div class="card"><strong>카드 전원</strong>
          <div class="checks-grid">
            <label class="toggle-row" data-nx-help-id="nx-power"><input type="checkbox" id="nx-power" ${i.power !== !1 ? "checked" : ""}><span>Power ON</span></label>
            <label class="toggle-row" data-nx-help-id="nx-floating-viewer"><input type="checkbox" id="nx-floating-viewer" ${i.floating_viewer !== !1 ? "checked" : ""}><span>플로팅 뷰어</span></label>
            <label class="toggle-row" data-nx-help-id="nx-overlay"><input type="checkbox" id="nx-overlay" ${i.overlay_markers !== !1 ? "checked" : ""}><span>채팅 왼쪽 줄 오버레이</span></label>
            <label class="toggle-row" data-nx-help-id="nx-llm-anchor"><input type="checkbox" id="nx-llm-anchor" ${i.llm_anchor_percent ? "checked" : ""}><span>LLM 읽기 위치 배치</span></label>
                        <label class="toggle-row" data-nx-help-id="nx-hide-offscreen"><input type="checkbox" id="nx-hide-offscreen" ${i.overlay_hide_offscreen !== !1 ? "checked" : ""}><span>화면 밖이면 이미지 숨김</span></label>
            <label class="toggle-row" data-nx-help-id="nx-scroll-track"><input type="checkbox" id="nx-scroll-track" ${i.scroll_message_track !== !1 ? "checked" : ""}><span>스크롤로 메시지 추적</span></label>
            <label class="toggle-row" data-nx-help-id="nx-click-track"><input type="checkbox" id="nx-click-track" ${i.click_message_track !== !1 ? "checked" : ""}><span>메시지 클릭으로 선택</span></label>
            <label class="toggle-row" data-nx-help-id="nx-text-drag"><input type="checkbox" id="nx-text-drag" ${i.text_drag_select !== !1 ? "checked" : ""}><span>글자 드래그 선택</span></label>
            <label class="toggle-row" data-nx-help-id="nx-mobile-pin"><input type="checkbox" id="nx-mobile-pin" ${i.mobile_toggle_pin ? "checked" : ""}><span>모바일 모서리 고정</span></label>
            <label class="toggle-row" data-nx-help-id="nx-hover-preview"><input type="checkbox" id="nx-hover-preview" ${i.hover_preview !== !1 ? "checked" : ""}><span>스티키 핀 호버 미리보기</span></label>
            <label class="toggle-row" data-nx-help-id="nx-risu-settings-button"><input type="checkbox" id="nx-risu-settings-button" ${i.show_risu_settings_button !== !1 ? "checked" : ""}><span>Risu 설정 바로가기</span></label>
            <label class="toggle-row" data-nx-help-id="nx-debug-panel"><input type="checkbox" id="nx-debug-panel" ${i.debug_panel ? "checked" : ""}><span>디버그 패널</span></label>
            <label class="toggle-row" data-nx-help-id="nx-gen-all-roles"><input type="checkbox" id="nx-gen-all-roles" ${i.generate_all_roles ? "checked" : ""}><span>모든 메시지 이미지 생성</span></label>
            <label class="toggle-row" data-nx-help-id="nx-auto-gen-reply"><input type="checkbox" id="nx-auto-gen-reply" ${i.auto_gen_on_reply ? "checked" : ""}><span>응답 후 자동 생성</span></label>
            <label class="toggle-row" data-nx-help-id="nx-lore"><input type="checkbox" id="nx-lore" ${i.lorebook !== !1 ? "checked" : ""}><span>Lorebook 주입</span></label>
            <label class="toggle-row" data-nx-help-id="nx-unified-priority"><input type="checkbox" id="nx-unified-priority" ${i.unified_chat_priority ? "checked" : ""}><span>통합 챗 우선</span></label>
            <label class="toggle-row" data-nx-help-id="nx-charinfo"><input type="checkbox" id="nx-charinfo" ${i.char_info !== !1 ? "checked" : ""}><span>CharInfo</span></label>
            <label class="toggle-row" data-nx-help-id="nx-userinfo"><input type="checkbox" id="nx-userinfo" ${i.user_info ? "checked" : ""}><span>UserInfo</span></label>
            <label class="toggle-row" data-nx-help-id="nx-appearance"><input type="checkbox" id="nx-appearance" ${i.char_appearance !== !1 ? "checked" : ""}><span>CharAppearance 누적</span></label>
          </div>
          <div class="model-form" style="margin-top:14px">
            <label data-nx-help-id="nx-execute"><span>발동</span>
              <select id="nx-execute"><option value="auto" ${i.execute !== "manual" ? "selected" : ""}>자동</option><option value="manual" ${i.execute === "manual" ? "selected" : ""}>수동</option></select>
            </label>
            <label data-nx-help-id="nx-inline-pct"><span>상시 이미지 크기 (%)</span>
              <input id="nx-inline-pct" type="number" min="1" step="10" value="${h(i.inline_thumb_pct ?? 100)}">
            </label>
            <label data-nx-help-id="nx-overlay-x"><span>스티키 핀 가로 위치 (% · 왼쪽 기준)</span>
              <input id="nx-overlay-x" type="number" min="0" max="100" step="1" value="${h(Math.floor(Number(pinUiX) || 0))}" ${i.mobile_toggle_pin ? "disabled" : ""}>
            </label>
            <label data-nx-help-id="nx-overlay-y"><span>스티키 핀 세로 위치 (% · 아래 기준)</span>
              <input id="nx-overlay-y" type="number" min="0" max="100" step="1" value="${h(Math.floor(Number(pinUiY) || 0))}">
            </label>
            <label data-nx-help-id="nx-hover-anchor"><span>호버 미리보기 기준</span>
              <select id="nx-hover-anchor">
                <option value="screen" ${(i.hover_preview_anchor || "screen") === "screen" ? "selected" : ""}>화면 기준</option>
                <option value="mouse" ${i.hover_preview_anchor === "mouse" ? "selected" : ""}>마우스 기준</option>
              </select>
            </label>
            <label data-nx-help-id="nx-minimize-mode"><span>접힘 표시 방식</span>
              <select id="nx-minimize-mode">
                <option value="icon" ${(i.viewer_minimize_mode || "icon") === "icon" ? "selected" : ""}>플로팅 아이콘</option>
                <option value="toolbar" ${i.viewer_minimize_mode === "toolbar" ? "selected" : ""}>상단 툴바 한 줄</option>
              </select>
            </label>
            <label data-nx-help-id="nx-select-gesture"><span>메시지 선택 동작</span>
              <select id="nx-select-gesture">
                <option value="single" ${(i.message_select_gesture || "single") === "single" ? "selected" : ""}>한 번 클릭</option>
                <option value="double" ${i.message_select_gesture === "double" ? "selected" : ""}>두 번 클릭</option>
              </select>
            </label>
            <label data-nx-help-id="nx-hover-corner"><span>이미지 모서리</span>
              <select id="nx-hover-corner">
                <option value="top-right" ${i.hover_preview_corner === "top-right" ? "selected" : ""}>우상단</option>
                <option value="bottom-right" ${(i.hover_preview_corner || "bottom-right") === "bottom-right" ? "selected" : ""}>우하단</option>
                <option value="top-left" ${i.hover_preview_corner === "top-left" ? "selected" : ""}>좌상단</option>
                <option value="bottom-left" ${i.hover_preview_corner === "bottom-left" ? "selected" : ""}>좌하단</option>
              </select>
            </label>
          </div>
          <div class="row" style="margin-top:12px"><button id="nx-save-dash" data-nx-help-id="nx-save-dash">대시보드 저장</button><button id="nx-run-now" class="secondary" data-nx-help-id="nx-run-now">지금 생성 (수동)</button><button id="nx-open-viewer" class="secondary" data-nx-help-id="nx-open-viewer">뷰어 앞으로</button></div>
          <div class="row" style="margin-top:8px"><button id="nx-reset-windows" class="secondary" type="button" data-nx-help-id="nx-reset-windows">모든 창 위치 초기화</button><button id="nx-reset-settings" class="secondary" type="button" data-nx-help-id="nx-reset-settings">모든 설정 초기화</button></div>
        </div>`;
    else if (t.uiTab === "card") {
      const d = kt(i), activePid = resolveActivePresetId(d), U = d.presets, f = U.find((g) => presetIdEq(g.id, activePid)) || U[0] || null, x = U.length ? U.map((g) => `<option value="${h(g.id)}" ${f && presetIdEq(g.id, f.id) ? "selected" : ""}>${h(g.name)}</option>`).join("") : '<option value="">(프리셋 없음)</option>', I = U.map((g) => `<button type="button" class="preset-chip ${f && presetIdEq(g.id, f.id) ? "active" : ""}" data-preset-select="${h(g.id)}" draggable="true">${h(g.name)}</button>`).join(""), R = [
        "gender",
        "girls",
        "people",
        "off"
      ].includes(i.person_tag_mode) ? i.person_tag_mode : i.auto_person_tags === !1 ? "off" : "gender", loreExtraUi = normalizeLoreExtraMode(i.lore_extra);
      u = `
        <div class="card model-card">
          <div class="prompt-group-label">생성 옵션</div>
          <div class="model-form">
            <label><span>Mode</span><select id="nx-mode"><option value="illustration" ${i.mode !== "asset" ? "selected" : ""}>삽화</option><option value="asset" ${i.mode === "asset" ? "selected" : ""}>에셋</option></select></label>
            <label><span>Image Min</span><input id="nx-min" type="number" min="1" max="6" value="${h(i.image_min ?? 1)}"></label>
            <label><span>Image Max</span><input id="nx-max" type="number" min="1" max="6" value="${h(i.image_max ?? 3)}"></label>
            <label><span>캐릭터 수 제한 (char1~)</span><input id="nx-char-max" type="number" min="1" max="6" value="${h(i.character_max ?? 6)}"></label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end">
            <label data-nx-help-id="nx-include-max"><span>Include Max (최근 문맥 개수)</span><input id="nx-include-max" type="number" min="0" max="20" value="${h(i.include_max ?? 0)}"></label>
            <label data-nx-help-id="nx-person-tag-weight"><span>사람 태그 강조 (0–5)</span><input id="nx-person-tag-weight" type="number" min="0" max="5" step="1" value="${h(i.person_tag_weight ?? 3)}"></label>
            </div>
            <label class="check wide"><input id="nx-preprocess" type="checkbox" ${i.preprocessing ? "checked" : ""}> Preprocessing (토큰 추가 소모)</label>
            <div class="wide" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:end">
            <label data-nx-help-id="nx-person-tag-mode"><span>사람 태그 자동넣기</span><select id="nx-person-tag-mode">
              <option value="gender" ${R === "gender" ? "selected" : ""}>성별 분리 (1girl, 1boy…)</option>
              <option value="girls" ${R === "girls" ? "selected" : ""}>인원수 → girls (4girls)</option>
              <option value="people" ${R === "people" ? "selected" : ""}>인원수 → people (4people)</option>
              <option value="off" ${R === "off" ? "selected" : ""}>안 넣기</option>
            </select></label>
            <label data-nx-help-id="nx-lore-extra"><span>lb-xnai.lb.extra</span><select id="nx-lore-extra">
              <option value="tags" ${loreExtraUi === "tags" ? "selected" : ""}>캐릭터 태그만</option>
              <option value="full" ${loreExtraUi === "full" ? "selected" : ""}>전체</option>
              <option value="off" ${loreExtraUi === "off" ? "selected" : ""}>넣지 않음</option>
            </select></label>
            <label data-nx-help-id="nx-natural-base"><span>자연어 base</span><select id="nx-natural-base">
              <option value="off" ${i.natural_base === !1 || i.natural_base === "off" ? "selected" : ""}>안넣기</option>
              <option value="short" ${i.natural_base !== !1 && i.natural_base !== "off" && i.natural_base !== "detailed" && i.natural_base !== "supplement" ? "selected" : ""}>짧게 넣기</option>
              <option value="detailed" ${i.natural_base === "detailed" ? "selected" : ""}>구도·자세히</option>
              <option value="supplement" ${i.natural_base === "supplement" ? "selected" : ""}>태그 보완 자연어</option>
            </select></label>
            </div>
          </div>
          <div class="notice info" style="margin-top:12px">캐릭터 수 제한 N이면 LLM 프롬프트에 반영되며, 생성 시에도 char1~char${h(i.character_max ?? 6)}까지만 들어갑니다.</div>
        </div>
        <div class="card model-card">
          <div class="model-head">
            <div>
              <div class="prompt-title">스타일 프리셋</div>
              <div class="muted">card.json / 로어북 [Positive]·[Negative] 항목을 불러와 바로 씁니다.</div>
            </div>
            <div class="row" style="margin:0;gap:8px;align-items:center;flex-shrink:0">
              <span class="badge ${U.length ? "custom" : "default"}">${U.length}개</span>
              <button type="button" id="nx-save-card-head">카드 설정 저장</button>
            </div>
          </div>
          <div class="preset-chip-row">${I || '<span class="muted">아직 프리셋이 없습니다. JSON을 불러오세요.</span>'}</div>
          <div class="preset-toolbar">
            <select id="nx-preset-select">${x}</select>
            <button type="button" id="nx-preset-new" class="secondary">새 프리셋</button>
            <button type="button" id="nx-preset-dup" class="secondary">복제</button>
            <button type="button" id="nx-preset-del" class="secondary">삭제</button>
          </div>
          <div class="model-form">
            <label class="wide"><span>프리셋 이름</span><input id="nx-preset-name" value="${h(f?.name || "")}" ${f ? "" : "disabled"}></label>
            <label class="wide"><span>Positive</span><textarea id="nx-custom-pos" ${f ? "" : "disabled"}>${h(f?.positive || "")}</textarea></label>
            <label class="wide"><span>Negative</span><textarea id="nx-custom-neg" ${f ? "" : "disabled"}>${h(f?.negative || "")}</textarea></label>
            <label><span>CFG scale</span><input id="nx-preset-cfg" type="number" step="0.1" placeholder="NAI 기본" value="${h(f?.cfg_scale ?? "")}" ${f ? "" : "disabled"}></label>
            <label><span>CFG rescale</span><input id="nx-preset-rescale" type="number" step="0.01" placeholder="NAI 기본" value="${h(f?.cfg_rescale ?? "")}" ${f ? "" : "disabled"}></label>
            <label class="wide"><span>Vibe Transfer</span>
              <div class="row" style="margin:0">
                <button type="button" id="nx-preset-vibe-pick" class="secondary" ${f ? "" : "disabled"}>이미지 불러오기</button>
                <button type="button" id="nx-preset-vibe-clear" class="secondary" ${f ? "" : "disabled"}>제거</button>
                <span id="nx-preset-vibe-status" class="muted">${f?.vibe_configured ? "설정됨 · 이 프리셋 사용" : "없음 · NAI 모델설정 사용"}</span>
              </div>
              <input id="nx-preset-vibe-file" type="file" accept="image/*" style="display:none">
            </label>
            <div class="ref-preview wide" id="nx-preset-vibe-preview">${f?.vibe_configured && f?.vibe_preview_url ? `<img src="${h(f.vibe_preview_url)}" alt="vibe">` : '<span class="muted">없음 · 생성 시 NAI 모델설정 vibe 사용</span>'}</div>
          </div>
          <div class="row" style="margin-top:14px">
            <button id="nx-save-card">카드 설정 저장</button>
            <button type="button" id="nx-preset-export" class="secondary">JSON 내보내기</button>
            <button type="button" id="nx-preset-file" class="secondary">JSON 파일 열기</button>
            <input id="nx-preset-file-input" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
        </div>`;
    } else if (t.uiTab === "characters") {
      const d = (t.gallery || [])[0]?.characters || [], U = d.length ? d.map((R, g) => `<div class="card"><strong>char${g + 1} · ${h(R.name || "")}</strong><div class="muted" style="margin-top:8px;white-space:pre-wrap">${h(R.prompt || "")}</div></div>`).join("") : '<div class="card"><div class="muted">최근 샷 캐릭터 없음</div></div>', Nn = !!(t.scopeOverride?.chatIndex === "unified" || t.lastScope?.unified), f = wt(t.charactersSession, "session", Nn ? "통합 챗에 모인 캐릭터가 없습니다. 채팅을 고른 뒤 다시 통합 챗을 선택하세요." : "이 채팅에 쌓인 캐릭터가 없습니다. 생성 후 자동으로 생깁니다."), x = wt(t.charactersGlobal, "global", "글로벌 캐릭터 없음. 모든 채팅에서 공유되며, 같은 이름은 글로벌이 우선합니다."), I = Number(i.character_max ?? 6) || 6;
      u = `
        ${sa(m)}
        <div class="notice info">별칭으로 메시지 매칭합니다. LLM에는 이름만 보내고, 외형/옷/악세사리 태그는 char1~char${I}에 직접 주입합니다. ${Nn ? "통합 챗은 성+이름이 한·영 표기 기준으로 일치할 때만 하나로 묶어 보여 줍니다(원본 기록은 지우지 않음)." : "옷·악세사리가 바뀌면 해당 칸만 교체됩니다."} 오토태그는 버튼 더블클릭(파일) 또는 클릭 후 Ctrl+V.</div>
        <div class="prompt-group-label">이번 샷 (최근 카드)</div>${U}
        <div class="prompt-group-label">${Nn ? "통합 챗 캐릭터" : "현재 채팅 캐릭터"}</div>
        <div id="nx-char-session-list">${f}</div>
        <div class="row" style="margin-top:10px">
          <button id="nx-char-add-session" class="secondary">${Nn ? "통합 캐릭터 추가" : "채팅 캐릭터 추가"}</button>
          <button id="nx-save-chars">${Nn ? "통합 캐릭터 저장" : "채팅 캐릭터 저장"}</button>
          <button id="nx-export-session-chars" class="secondary">JSON 내보내기</button>
          <button id="nx-import-session-chars" class="secondary">JSON 불러오기</button>
          <input id="nx-import-session-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          ${Nn ? '<button id="nx-unify-rebuild" class="secondary">채팅에서 다시 모으기</button>' : ""}
        </div>
        <div class="prompt-group-label" style="margin-top:18px">글로벌 캐릭터</div>
        <div class="notice info" style="margin-bottom:10px">글로벌 캐릭터는 모든 채팅에서 공유됩니다. 특정 챗에서만 끄려면 카드를 펼쳐 「이 캐릭터 챗에서 사용」을 해제하세요. JSON 내보내기/불러오기는 이름·성·별칭·외형 태그를 파일로 옮깁니다.</div>
        <div id="nx-char-global-list">${x}</div>
        <div class="row" style="margin-top:10px">
          <button id="nx-char-add-global" class="secondary">글로벌 캐릭터 추가</button>
          <button id="nx-save-global-chars">글로벌 저장</button>
          <button id="nx-export-global-chars" class="secondary">JSON 내보내기</button>
          <button id="nx-import-global-chars" class="secondary">JSON 불러오기</button>
          <input id="nx-import-global-chars-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          <button id="nx-refresh-chars" class="secondary">새로고침</button>
        </div>`;
    } else if (t.uiTab === "prompts") {
      const promptMeta = {
        author_note: {
          title: "작가의 노트 (사용자 프롬프트 지침)",
          hint: "비워두면 무시됩니다. 태깅 LLM 요청 맨 끝에 최우선 지침으로 들어갑니다.",
        },
      };
      const promptCards = (t.prompts || []).map((d) => {
        const meta = promptMeta[d.key] || null;
        const title = meta?.title || d.key;
        const hint = meta?.hint ? `<div class="muted" style="margin:4px 0 8px">${h(meta.hint)}</div>` : "";
        return `
          <div class="card">
            <strong>${h(title)}</strong>${d.key !== title ? `<div class="muted" style="font-size:11px;margin-top:2px">${h(d.key)}</div>` : ""}
            ${hint}
            <textarea id="nx-prompt-${h(d.key)}" placeholder="${d.key === "author_note" ? "예: 항상 실내 조명, 캐릭터는 교복 유지…" : ""}">${h(t.promptDrafts[d.key] ?? d.text ?? "")}</textarea>
            <div class="row" style="flex-wrap:wrap;gap:8px">
              <button data-save-prompt="${h(d.key)}">저장</button>
              <button class="secondary" data-reset-prompt="${h(d.key)}">기본값 복원</button>
              <button class="secondary" data-export-prompt="${h(d.key)}">JSON 내보내기</button>
              <button class="secondary" data-import-prompt="${h(d.key)}">JSON 불러오기</button>
              <input data-import-prompt-file="${h(d.key)}" type="file" accept=".json,application/json,text/plain" style="display:none">
            </div>
          </div>`;
      }).join("");
      u = `
        <div class="prompt-toolbar">
          <div><strong>프롬프트</strong><div class="muted">작가의 노트만 남기고 나머지를 기본값으로 돌리거나, 전체/개별 JSON으로 백업할 수 있습니다.</div></div>
          <div class="toolbar-actions" style="flex-wrap:wrap;gap:8px">
            <button id="nx-prompts-reset-defaults" class="secondary">기본값 복원 (작가 노트 제외)</button>
            <button id="nx-prompts-export" class="secondary">전체 JSON 내보내기</button>
            <button id="nx-prompts-import" class="secondary">전체 JSON 불러오기</button>
            <input id="nx-prompts-import-file" type="file" accept=".json,application/json,text/plain" style="display:none">
          </div>
        </div>
        ${promptCards}`;
    }
    else if (t.uiTab === "models") {
      const LH = globalThis.__INLAY_LLM__ || {}, llmSource = c.source === "main" || c.source === "aux" ? c.source : "custom", providerRaw = w(c.provider) || "openrouter", f = LH.normalizeLlmProvider?.(providerRaw) || providerRaw, providers = LH.LLM_PROVIDERS || [
        { value: "openrouter", label: "OpenRouter" },
        { value: "openai", label: "OpenAI" },
        { value: "google_ai", label: "Google AI Studio" },
        { value: "vertex", label: "Vertex AI (Google Cloud)" },
        { value: "anthropic_compatible", label: "Anthropic-compatible" },
        { value: "lmstudio", label: "LM Studio (로컬)" },
        { value: "ollama", label: "Ollama (로컬)" },
        { value: "custom", label: "Custom endpoint" }
      ], reasoning = w(c.reasoning_effort) || "default", vertexOn = f === "vertex", anthropicOn = f === "anthropic_compatible", openrouterish = f === "openrouter" || f === "openai" || f === "custom", credOk = vertexOn ? !!(c.service_account_configured || c.api_key_configured) : !!c.api_key_configured, d = llmSource !== "custom" || !!(w(c.model) && (credOk || w(c.endpoint))), imgBk = w(s.backend) === "comfy" ? "comfy" : "nai", U = imgBk === "comfy" ? !!s.comfy_configured || !!w(s.comfy_workflow_json) : !!s.api_key_configured, epPh = LH.defaultEndpointForProvider?.(f, { region: c.vertex_region }) || "https://openrouter.ai/api/v1/chat/completions", modelPh = LH.llmModelPlaceholder?.(f) || "model-id", customSource = llmSource === "custom";
      u = `
        <div class="prompt-toolbar">
          <div><strong>모델 설정</strong><div class="muted">태깅은 직접 LLM 또는 Risu 메인/보조 모델로, 이미지는 NovelAI 또는 ComfyUI로 생성합니다. 시크릿 원문은 다시 표시하지 않습니다.</div></div>
          <div class="toolbar-actions"><button id="nx-save-models">전체 설정 저장</button></div>
        </div>
        <div class="prompt-group-label">태깅 LLM</div>
        <article class="model-card">
          <div class="model-head">
            <div><div class="prompt-title">태깅 LLM</div><div class="muted">OpenRouter · OpenAI · Google · Vertex · Anthropic · 로컬 · Risu</div></div>
            <span class="badge ${d ? "custom" : "default"}">${d ? "활성" : "비활성"} · ${llmSource === "main" ? "Risu 메인" : llmSource === "aux" ? "Risu 보조" : `${vertexOn ? "Service Account" : "API key"} ${credOk ? "설정됨" : "없음"}`}</span>
          </div>
          <div class="notice info" style="margin:12px 0 0"><strong>소스</strong>에서 Risu 메인/보조를 고르면 플러그인 키가 필요 없습니다. 직접 입력일 때 Provider를 바꾸면 Endpoint가 기본값으로 바뀝니다.</div>
          <div class="model-form">
            <label class="wide"><span>태깅 모델 소스</span>
              <select id="nx-llm-source">
                <option value="custom" ${customSource ? "selected" : ""}>직접 입력 (엔드포인트 + 키)</option>
                <option value="main" ${llmSource === "main" ? "selected" : ""}>Risu 메인 모델</option>
                <option value="aux" ${llmSource === "aux" ? "selected" : ""}>Risu 보조 모델</option>
              </select>
            </label>
            <label><span>Provider</span>
              <select id="nx-llm-provider" ${customSource ? "" : "disabled"}>
                ${providers.map((opt) => `<option value="${h(opt.value)}" ${f === opt.value ? "selected" : ""}>${h(opt.label)}</option>`).join("")}
              </select>
            </label>
            <label><span>Model</span><input id="nx-llm-model" value="${h(c.model || "")}" placeholder="${h(modelPh)}"></label>
            <label class="wide"><span>Endpoint${vertexOn || f === "google_ai" || anthropicOn ? " (비워두면 기본값)" : ""}</span><input id="nx-llm-endpoint" type="url" value="${h(c.endpoint || "")}" placeholder="${h(epPh)}" ${vertexOn ? "disabled" : ""}></label>
            ${vertexOn ? `<label><span>Region</span><input id="nx-llm-vertex-region" value="${h(c.vertex_region || "us-central1")}" placeholder="us-central1"></label>` : `<input id="nx-llm-vertex-region" type="hidden" value="${h(c.vertex_region || "us-central1")}">`}
            ${vertexOn ? `<label class="wide"><span>Service Account JSON <span class="key-status">${c.service_account_configured ? "설정됨" : "없음"}</span></span><textarea id="nx-llm-service-account" rows="4" autocomplete="off" placeholder='{"client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...","project_id":"..."}'></textarea></label><label class="check wide"><input id="nx-llm-clear-sa" type="checkbox"> 저장된 Service Account JSON 지우기</label><label class="wide"><span>Access token (선택) <span class="key-status">${c.api_key_configured ? "설정됨" : "없음"}</span></span><input id="nx-llm-key" type="password" autocomplete="new-password" placeholder="SA 대신 Bearer access token을 쓸 때만"></label>` : `<label class="wide"><span>API key <span class="key-status">${c.api_key_configured ? "설정됨" : "없음"}</span></span><input id="nx-llm-key" type="password" autocomplete="new-password" placeholder="비워 두면 기존 키 유지"></label><textarea id="nx-llm-service-account" style="display:none"></textarea><input id="nx-llm-clear-sa" type="checkbox" style="display:none">`}
            ${anthropicOn ? `<label><span>Anthropic version</span><input id="nx-llm-anthropic-version" value="${h(c.anthropic_version || "2023-06-01")}" placeholder="2023-06-01"></label>` : `<input id="nx-llm-anthropic-version" type="hidden" value="${h(c.anthropic_version || "2023-06-01")}">`}
            <label><span>Temperature</span><input id="nx-llm-temp" type="number" min="0" max="${anthropicOn ? 1 : 2}" step="0.01" value="${h(c.temperature ?? 0.4)}"></label>
            <label><span>Max tokens</span><input id="nx-llm-max" type="number" min="64" max="128000" value="${h(c.max_tokens ?? 8e3)}"></label>
            ${openrouterish || f === "google_ai" || vertexOn ? `<label><span>Reasoning (추론)</span>
              <select id="nx-llm-reasoning">
                ${[
        ["default", "기본값 (모델 기본)"],
        ["none", "none · 추론 끔"],
        ["minimal", "minimal"],
        ["low", "low"],
        ["medium", "medium"],
        ["high", "high"],
        ["xhigh", "xhigh"],
        ["max", "max"]
      ].map(([val, lab]) => `<option value="${val}" ${reasoning === val ? "selected" : ""}>${lab}</option>`).join("")}
              </select>
            </label>` : `<input id="nx-llm-reasoning" type="hidden" value="${h(reasoning)}">`}
          </div>
          <div class="muted model-hint">OpenRouter Reasoning은 지원 모델에만 적용됩니다. Provider를 바꾸면 알려진 기본 Endpoint로 자동 교체되고, 직접 고친 커스텀 URL은 유지합니다.</div>
          <div class="model-actions"><button id="nx-test-llm">태깅 LLM 연결 테스트</button>${$t("llm")}</div>
        </article>
        <div class="prompt-group-label">이미지 생성</div>
        <article class="model-card">
          <div class="model-head">
            <div><div class="prompt-title">${imgBk === "comfy" ? "ComfyUI" : "Novel AI"}</div><div class="muted">${imgBk === "comfy" ? "로컬 ComfyUI API · [[pos]] / [[neg]] / [[char1]]… / [[seed]]" : `char1~char${Number(i.character_max ?? 6) || 6} CharacterCaption + t2i 생성`}</div></div>
            <span class="badge ${U ? "custom" : "default"}">${imgBk === "comfy" ? (U ? "활성 · 워크플로 설정됨" : "비활성 · 워크플로 없음") : `${U ? "활성" : "비활성"} · API key ${s.api_key_configured ? "설정됨" : "없음"}`}</span>
          </div>
          <div class="model-form">
            <label class="wide"><span>이미지 생성 공급자</span>
              <input type="hidden" id="nx-img-backend" value="${h(imgBk)}">
              <div class="nx-seg" id="nx-img-backend-bar">
                <button type="button" data-backend="nai" class="${imgBk === "nai" ? "active" : ""}">NovelAI (NAI)</button>
                <button type="button" data-backend="comfy" class="${imgBk === "comfy" ? "active" : ""}">ComfyUI</button>
              </div>
            </label>
            ${imgBk === "comfy" ? `
            <label class="wide"><span>ComfyUI 요청 URL</span><input id="nx-comfy-url" type="url" value="${h(s.comfy_url || "http://localhost:8188")}" placeholder="http://localhost:8188"></label>
            <label class="wide"><span>Workflow <span class="key-status">API Export JSON</span></span>
              <textarea id="nx-comfy-workflow" rows="8" spellcheck="false" placeholder='{"3":{"inputs":{"text":"[[pos]]\\n[[char1]]"},"class_type":"CLIPTextEncode"}}'>${h(s.comfy_workflow_json || "")}</textarea>
              <div class="row" style="margin:8px 0 0">
                <button type="button" id="nx-comfy-wf-pick" class="secondary">JSON 파일 불러오기</button>
                <input id="nx-comfy-wf-file" type="file" accept="application/json,.json" style="display:none">
                <span class="muted">${s.comfy_workflow_json ? "등록됨 (" + Math.round(String(s.comfy_workflow_json).length / 1024) + "KB)" : "미등록"}</span>
              </div>
            </label>
            <label><span>Timeout (sec)</span><input id="nx-backend-timeout" type="number" min="30" max="1800" value="${h(s.backend_timeout_seconds ?? 300)}"></label>
            ` : `
            <label><span>이미지 생성 공급자 이름</span><input id="nx-nai-provider" value="${h(s.provider || "Novel AI")}"></label>
            <label><span>Model</span><input id="nx-nai-model" value="${h(s.model || "nai-diffusion-4-5-full")}"></label>
            <label class="wide"><span>Novel AI 요청 URL</span><input id="nx-nai-url" type="url" value="${h(s.request_url || "https://image.novelai.net/ai/generate-image")}"></label>
            <label class="wide"><span>API key <span class="key-status">${s.api_key_configured ? "설정됨" : "없음"}</span></span><input id="nx-nai-key" type="password" autocomplete="new-password" placeholder="비워 두면 기존 키 유지"></label>
            <label><span>Width</span><input id="nx-nai-w" type="number" step="64" value="${h(s.width ?? 832)}"></label>
            <label><span>Height</span><input id="nx-nai-h" type="number" step="64" value="${h(s.height ?? 1216)}"></label>
            <label><span>Sampler</span>
              <select id="nx-nai-sampler">
                ${[
        ["k_euler_ancestral", "Euler Ancestral"],
        ["k_euler", "Euler"],
        ["k_dpmpp_2m", "DPM++ 2M"],
        ["k_dpmpp_2s_ancestral", "DPM++ 2S Ancestral"],
        ["k_dpmpp_sde", "DPM++ SDE"],
        ["ddim_v3", "DDIM"]
      ].map(([x, I]) => `<option value="${x}" ${(s.sampler || "k_euler_ancestral") === x ? "selected" : ""}>${I}</option>`).join("")}
              </select>
            </label>
            <label><span>Noise Schedule</span>
              <select id="nx-nai-sched">
                ${[
        "karras",
        "native",
        "exponential",
        "polyexponential"
      ].map((x) => `<option value="${x}" ${(s.scheduler || "karras") === x ? "selected" : ""}>${x}</option>`).join("")}
              </select>
            </label>
            <label><span>Steps</span><input id="nx-nai-steps" type="number" min="1" max="150" value="${h(s.steps ?? 28)}"></label>
            <label><span>CFG scale</span><input id="nx-nai-cfg" type="number" step="0.1" value="${h(s.cfg_scale ?? 7)}"></label>
            <label><span>CFG rescale</span><input id="nx-nai-rescale" type="number" step="0.01" value="${h(s.cfg_rescale ?? 0.36)}"></label>
            <label><span>Reference Strength</span><input id="nx-nai-ref-strength" type="number" min="0" max="1" step="0.05" value="${h(s.image_reference_strength ?? 0.6)}"></label>
            <label><span>Reference Fidelity</span><input id="nx-nai-ref-fidelity" type="number" min="0" max="1" step="0.05" value="${h(s.image_reference_fidelity ?? 1)}"></label>
            <label class="wide"><span>Image Reference Type</span>
              <select id="nx-nai-ref-type">
                ${[
        ["character&style", "Character & Style"],
        ["character", "Character"],
        ["style", "Style"]
      ].map(([x, I]) => `<option value="${x}" ${(s.image_reference_type || "character&style") === x ? "selected" : ""}>${I}</option>`).join("")}
              </select>
            </label>
            <label class="wide"><span>Image Reference (PC 파일)</span>
              <div class="row" style="margin:0">
                <button type="button" id="nx-nai-ref-pick" class="secondary">이미지 불러오기</button>
                <button type="button" id="nx-nai-ref-clear" class="secondary">제거</button>
                <span id="nx-nai-ref-status" class="muted">${s.image_reference_configured ? "설정됨" : "없음"}</span>
              </div>
              <input id="nx-nai-ref-file" type="file" accept="image/*" style="display:none">
              <input id="nx-nai-ref" type="hidden" value="${h(s.image_reference_configured ? "file" : s.image_reference || "none")}">
            </label>
            <div class="ref-preview wide" id="nx-nai-ref-preview">${s.image_reference_configured ? `<img src="${h((globalThis.__INLAY_NATIVE__?.refPreviewUrl?.() || ""))}" alt="reference">` : '<span class="muted">선택된 참조 이미지 없음</span>'}</div>
            <div class="model-form-pair">
              <label><span>Vibe Strength</span><input id="nx-nai-vibe-strength" type="number" min="0" max="1" step="0.05" value="${h(s.vibe_transfer_strength ?? 0.6)}"></label>
              <label><span>Vibe Information Extracted</span><input id="nx-nai-vibe-ie" type="number" min="0" max="1" step="0.05" value="${h(s.vibe_transfer_information_extracted ?? 1)}"></label>
            </div>
            <label class="wide"><span>Vibe Transfer (PC 파일)</span>
              <div class="row" style="margin:0">
                <button type="button" id="nx-nai-vibe-pick" class="secondary">이미지 불러오기</button>
                <button type="button" id="nx-nai-vibe-clear" class="secondary">제거</button>
                <span id="nx-nai-vibe-status" class="muted">${s.vibe_transfer_configured ? "설정됨" : "없음"}</span>
              </div>
              <input id="nx-nai-vibe-file" type="file" accept="image/*" style="display:none">
              <input id="nx-nai-vibe" type="hidden" value="${h(s.vibe_transfer_configured ? "file" : s.vibe_transfer || "none")}">
            </label>
            <div class="ref-preview wide" id="nx-nai-vibe-preview">${s.vibe_transfer_configured ? `<img src="${h((globalThis.__INLAY_NATIVE__?.vibePreviewUrl?.() || ""))}" alt="vibe">` : '<span class="muted">선택된 vibe 이미지 없음</span>'}</div>
            <div class="muted wide" style="font-size:12px">Vibe 업로드 시 encode-vibe가 즉시 실행되며 2 Anlas가 소모됩니다. 결과는 캐시되어 재사용됩니다.</div>
            <label class="check wide"><input id="nx-nai-var" type="checkbox" ${s.variety_plus ? "checked" : ""}> Variety+</label>
            <label class="check wide"><input id="nx-nai-i2i" type="checkbox" ${s.enable_i2i ? "checked" : ""}> Enable I2I</label>
            <label class="check wide"><input id="nx-nai-quality" type="checkbox" ${s.apply_quality_tags !== !1 ? "checked" : ""}> Quality Tags 자동 적용</label>
            `}
          </div>
          <div class="muted model-hint">${imgBk === "comfy" ? "연결 테스트는 ComfyUI /system_stats와 워크플로 [[pos]] 검사를 합니다. 실제 생성은 채팅 job에서 수행됩니다." : "테스트는 토큰/잔액 확인 위주입니다. 실제 이미지 생성은 채팅 job에서 수행됩니다."}</div>
          <div class="model-actions"><button id="nx-test-nai">${imgBk === "comfy" ? "ComfyUI 연결 테스트" : "Novel AI 연결 테스트"}</button>${$t("nai")}</div>
          ${imgBk === "comfy" ? `
          <div class="nx-comfy-help">
              <strong>사용법</strong><br>
              1) ComfyUI 설정에서 개발자 옵션 → <strong>API 내보내기</strong>를 켭니다.<br>
              2) Workflow → <strong>Export (API)</strong>로 JSON을 받은 뒤, 위에 붙여넣거나 파일로 불러옵니다.<br>
              3) JSON 안에서 긍정 프롬프트를 넣는 칸에 <code>[[pos]]</code>, 부정에 <code>[[neg]]</code>, 캐릭터 태그를 넣고 싶은 칸에 <code>[[char1]]</code> / <code>[[char2]]</code> … 를 적어 둡니다.<br>
              4) 저장 후 생성하면 Inlay가 만든 프롬프트로 그 자리가 치환됩니다.<br><br>
              <strong>시드 (랜덤)</strong> — API Export의 숫자 seed는 요청마다 Inlay가 새 랜덤 시드로 덮어씁니다.<br>
              명시적으로 쓰려면 <code>"seed": "[[seed]]"</code>처럼 <strong>따옴표로 감싸서</strong> 넣으세요. (숫자만 남겨둬도 자동 랜덤)<br><br>
              <strong>조건부 마커</strong> — 캐릭터가 없을 때 헤더까지 통째로 지우려면 블록으로 감싸세요.<br>
              <code>[[#char3]]</code> …내용… <code>[[/char3]]</code><br>
              <code>[[char3]]</code> 값이 비어 있으면 그 블록 전체가 삭제되고, 있으면 안쪽만 남긴 뒤 <code>[[char3]]</code>가 치환됩니다.<br>
              예:<br>
              <code>[[#char1]]</code><br>
              ## Character 1<br>
              ### Outfit, Appearance Design &amp; Facial Expression<br>
              <code>[[char1]]</code><br>
              <code>[[/char1]]</code>
          </div>` : ""}
        </article>`;
    } else if (t.uiTab === "curation") {
      const EH = globalThis.__INLAY_EMBED__ || {}, cur = t.backendSettings?.curation || {}, emb = cur.embedding || {}, st = t.curationStatus || {}, mode = w(cur.mode) || "off", strictIds = cur.strict_ids === !0, embSt = w(st.embed_status) || "missing", pct = st.embed_progress && st.embed_progress.total ? Math.round(100 * (st.embed_progress.done || 0) / st.embed_progress.total) : 0, embProviderRaw = w(emb.provider) || "openai", embProvider = EH.normalizeEmbeddingProvider?.(embProviderRaw) || embProviderRaw, embProviders = EH.EMBEDDING_PROVIDERS || [{ value: "openai", label: "OpenAI" }, { value: "voyage", label: "Voyage" }, { value: "openrouter", label: "OpenRouter" }, { value: "openai_compat", label: "OpenAI-compat" }, { value: "lmstudio", label: "LM Studio (로컬)" }, { value: "ollama", label: "Ollama (로컬)" }, { value: "custom", label: "Custom endpoint" }], embEpPh = EH.defaultEndpointForEmbedding?.(embProvider) || "https://api.openai.com/v1/embeddings", embModelPh = EH.embeddingModelPlaceholder?.(embProvider) || EH.defaultModelForEmbedding?.(embProvider) || "text-embedding-3-small", embNeedsKey = EH.embeddingProviderNeedsApiKey?.(embProvider) !== !1, embCredOk = !!emb.api_key_configured, embReady = !!(w(emb.model) && (!embNeedsKey || embCredOk));
      u = `
        <div class="prompt-toolbar">
          <div><strong>큐레이팅</strong><div class="muted">씬 태그 큐레이션. 캐릭터 외형/의상 태그는 모드와 무관하게 LLM이 유지합니다.</div></div>
          <div class="toolbar-actions"><button type="button" id="nx-curation-save">설정 저장</button></div>
        </div>
        <article class="model-card" data-nx-help-id="nx-curation-mode">
          <div class="prompt-title">모드</div>
          <div class="nx-seg" id="nx-curation-mode-bar" style="margin-top:10px">
            <button type="button" data-nx-curation-mode="off" class="${mode === "off" ? "active" : ""}">사용안함</button>
            <button type="button" data-nx-curation-mode="two_stage" class="${mode === "two_stage" ? "active" : ""}">2단</button>
            <button type="button" data-nx-curation-mode="embed_snap" class="${mode === "embed_snap" ? "active" : ""}">임베딩식</button>
          </div>
          <label data-nx-help-id="nx-curation-strict-ids" class="toggle-row" style="margin-top:10px;${mode === "two_stage" ? "" : "opacity:.5"}"><input type="checkbox" id="nx-curation-strict-ids" ${strictIds ? "checked" : ""} ${mode === "two_stage" ? "" : "disabled"}><span>엄격 ID 모드 (2단 전용) — 씬/동작을 자유 문장 없이 카탈로그 ID로만 조립</span></label>
        </article>
        <article class="model-card" data-nx-help-id="nx-curation-catalog" style="margin-top:12px">
          <div class="prompt-title">카탈로그</div>
          <div class="muted" id="nx-curation-catalog-meta" style="margin-top:8px">${h(st.catalog_name || "(기본)")} · 그룹 ${st.group_count ?? "-"} · 옵션 ${st.option_count ?? "-"} · sha ${h(st.catalog_sha || "-")}${st.large_warning ? " · ⚠ 항목 많음" : ""}</div>
          <div class="toolbar-actions" style="margin-top:10px;gap:8px;display:flex;flex-wrap:wrap">
            <label class="secondary" style="cursor:pointer;display:inline-flex;align-items:center;padding:8px 12px;border-radius:10px;border:1px solid var(--border2)"><input type="file" id="nx-curation-catalog-file" accept="application/json,.json" hidden>JSON 불러오기</label>
            <button type="button" class="secondary" id="nx-curation-catalog-reset">기본값 복원</button>
          </div>
        </article>
        <div class="prompt-group-label" style="margin-top:14px">임베딩</div>
        <article class="model-card" data-nx-help-id="nx-curation-embedding-provider">
          <div class="model-head">
            <div><div class="prompt-title">임베딩 모델</div><div class="muted">OpenAI · Voyage · OpenRouter · 로컬 · Custom</div></div>
            <span class="badge ${embReady ? "custom" : "default"}">${embReady ? "활성" : "비활성"} · ${embNeedsKey ? (embCredOk ? "API key 설정됨" : "API key 없음") : "로컬 (키 선택)"}</span>
          </div>
          <div class="notice info" style="margin:12px 0 0"><strong>팁</strong> Provider를 바꾸면 Endpoint·Model이 기본값으로 바뀝니다. 직접 고친 Endpoint는 유지됩니다.</div>
          <div class="model-form">
            <label><span>Provider</span>
              <select id="nx-curation-emb-provider">
                ${embProviders.map((opt) => `<option value="${h(opt.value)}" ${embProvider === opt.value ? "selected" : ""}>${h(opt.label)}</option>`).join("")}
              </select>
            </label>
            <label><span>Model</span><input id="nx-curation-emb-model" value="${h(emb.model || embModelPh)}" placeholder="${h(embModelPh)}"></label>
            <label class="wide"><span>Endpoint</span><input id="nx-curation-emb-endpoint" type="url" value="${h(emb.endpoint || embEpPh)}" placeholder="${h(embEpPh)}"></label>
            <label class="wide"><span>API key <span class="key-status">${embCredOk ? "설정됨" : "없음"}</span></span><input id="nx-curation-emb-key" type="password" autocomplete="new-password" placeholder="비워 두면 기존 키 유지"></label>
          </div>
          <div class="model-actions"><button type="button" id="nx-curation-emb-test">임베딩 연결 테스트</button>${(t.modelTestResults || {}).curation_emb ? `<div id="nx-test-result-curation_emb" class="test-result ${(t.modelTestResults || {}).curation_emb.ok ? "success" : "error"}">${(t.modelTestResults || {}).curation_emb.ok ? "성공 · " : "실패 · "}${h((t.modelTestResults || {}).curation_emb.message || "")}</div>` : `<div id="nx-test-result-curation_emb" class="test-result">아직 테스트하지 않았습니다.</div>`}</div>
        </article>
        <article class="model-card" data-nx-help-id="nx-curation-embed" style="margin-top:12px">
          <div class="model-head">
            <div><div class="prompt-title">카탈로그 임베딩 생성</div><div class="muted">선임베딩 → 기기 저장. 생성마다 카탈로그 전체를 다시 보내지 않습니다.</div></div>
            <span class="badge ${embSt === "ready" ? "custom" : "default"}">${embSt === "ready" ? "준비됨" : embSt === "stale" ? "재생성 필요" : "없음"}</span>
          </div>
          <div class="muted" style="margin-top:8px">${st.embed_count || 0} vectors · ${h(st.embed_model || "-")}</div>
          <div style="margin-top:10px;height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><div id="nx-curation-embed-bar" style="height:100%;width:${pct}%;background:rgba(124,108,255,.75);transition:width .2s"></div></div>
          <div class="muted" id="nx-curation-embed-msg" style="margin-top:6px">${h(st.embed_progress?.message || (embSt === "missing" ? "임베딩식 사용 전 생성이 필요합니다." : embSt === "stale" ? "카탈로그/모델이 바뀌었습니다. 다시 생성하세요." : ""))}</div>
          <div class="model-actions" style="margin-top:10px"><button type="button" id="nx-curation-embed-run">임베딩 생성</button></div>
        </article>
      `;
    } else t.uiTab === "explorer" ? u = ma() : t.uiTab === "debug" && (u = `
        <div class="card">
          <strong>런타임 상태</strong>
          <pre id="nx-debug-status" style="margin-top:10px;white-space:pre-wrap;font:12px/1.5 Consolas,monospace;color:#c9d4e6;max-height:360px;overflow:auto;background:rgba(0,0,0,.25);padding:12px;border-radius:12px">${h(Ve())}</pre>
          <div class="row" style="margin-top:12px">
            <button id="nx-debug-refresh" class="secondary">새로고침</button>
            <button id="nx-debug-clear" class="secondary">로그 비우기</button>
            <button id="nx-debug-copy" class="secondary">로그 복사</button>
            <button id="nx-debug-ping" class="secondary">핑 로그</button>
          </div>
        </div>
        <div class="card" style="margin-top:14px">
          <strong>이벤트 로그 (최신 ${Math.min(120, t.debugLog.length)} / ${t.debugLog.length})</strong>
          <pre id="nx-debug-log" style="margin-top:10px;white-space:pre-wrap;font:11.5px/1.45 Consolas,monospace;color:#b8c4d8;max-height:420px;overflow:auto;background:rgba(0,0,0,.28);padding:12px;border-radius:12px">${h(Ye(120) || "(아직 로그 없음)")}</pre>
          <div class="notice info" style="margin-top:12px">채팅 화면 좌측 하단 디버그 패널에서도 같은 로그를 볼 수 있습니다. afterRequest → job → gallery → overlay 순서로 찍힙니다.</div>
        </div>`);
    const b = t.jobProgress, C = b ? `<div class="card"><strong>생성 진행</strong><div class="value" style="font-size:14px">${h(b.message || b.state || "-")}</div><div class="progress-rail"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, Number(b.progress) || 0))}%"></div></div></div>` : `<div class="card"><strong>Job</strong><div class="value" style="font-size:14px">${h(t.activeJobId || "-")}</div></div>`, S = {
      dashboard: "대시보드",
      card: "카드 설정",
      characters: "캐릭터",
      prompts: "프롬프트",
      models: "모델 설정",
      curation: "큐레이팅",
      explorer: "이미지 탐색",
      debug: "디버그"
    }, E = [
      "dashboard",
      "card",
      "characters",
      "prompts",
      "models",
      "curation",
      "explorer",
      "debug"
    ].map((d) => `<button type="button" class="tab ${t.uiTab === d ? "active" : ""}" data-nx-tab="${d}">${S[d]}</button>`).join(""), j = [p ? `<div class="notice ${h(p.type || "info")}">${h(p.text || "")}</div>` : "", o ? `<div class="notice error">${h(o)}</div>` : ""].join("");
    if (e === t.uiRenderGen) {
      if (!document.getElementById("nx-shell"))
        document.body.innerHTML = `
        <style>${ga}</style>
        <div class="wrap" id="nx-shell">
          <div class="chrome" id="nx-chrome">
            <div class="head">
              <div class="head-brand"><h1>Inlay Nexus</h1><div class="muted" id="nx-version-line">v${He}</div></div>
              <div class="head-help" id="nx-head-help" aria-live="polite">
                <div class="head-help-title" id="nx-head-help-title">${h(HEAD_HELP_DEFAULT.title)}</div>
                <div class="head-help-body" id="nx-head-help-body">${h(HEAD_HELP_DEFAULT.body)}</div>
              </div>
              <div class="head-actions">
                <span id="nx-save-flash" class="save-flash"></span>
                <button type="button" id="nx-save-all" class="secondary">전체 저장</button>
                <button type="button" id="nx-export-all" class="secondary">전체 설정 내보내기</button>
                <button type="button" id="nx-import-all" class="secondary">전체 설정 불러오기</button>
                <input id="nx-import-all-file" type="file" accept=".json,application/json,text/plain" style="display:none">
                <button type="button" id="nx-close" class="secondary">닫기</button>
              </div>
            </div>
            <nav class="tabs" id="nx-tabs">${E}</nav>
          </div>
          <div class="grid" id="nx-status-grid">
            <div class="card"><strong>백엔드</strong><div class="value" id="nx-health-value">${l}</div></div>
            <div class="card"><strong>훅</strong><div class="value" id="nx-hook-value" style="font-size:16px">${t.replacerReady ? "afterRequest 활성" : h(t.replacerError || "비활성")}</div></div>
            <div id="nx-job-card">${C}</div>
          </div>
          <div id="nx-notices">${j}</div>
          <div id="nx-main">${u}</div>
        </div>
        <div id="nx-explorer-tip" class="explorer-tip"></div>`, wa(), bindHeadHelp(document.getElementById("nx-shell"));
      else {
        const d = document.getElementById("nx-version-line");
        d && (d.textContent = `v${He}`);
        const U = document.getElementById("nx-health-value");
        U && (U.innerHTML = l);
        const f = document.getElementById("nx-hook-value");
        f && (f.textContent = t.replacerReady ? "afterRequest 활성" : t.replacerError || "비활성");
        const x = document.getElementById("nx-job-card");
        x && (x.innerHTML = C);
        const I = document.getElementById("nx-notices");
        I && (I.innerHTML = j), document.querySelectorAll("#nx-tabs [data-nx-tab]").forEach((g) => {
          g.classList.toggle("active", g.getAttribute("data-nx-tab") === t.uiTab);
        });
        const _sg = document.getElementById("nx-status-grid");
        _sg && (_sg.style.display = t.uiTab === "dashboard" ? "" : "none");
        const R = document.getElementById("nx-main");
        R && (R.innerHTML = u);
        const head = document.querySelector("#nx-chrome .head");
        if (head && !document.getElementById("nx-head-help")) {
          const brand = head.querySelector("h1")?.parentElement;
          brand && brand.classList.add("head-brand");
          const help = document.createElement("div");
          help.className = "head-help", help.id = "nx-head-help", help.setAttribute("aria-live", "polite"), help.innerHTML = `<div class="head-help-title" id="nx-head-help-title"></div><div class="head-help-body" id="nx-head-help-body"></div>`;
          const actions = head.querySelector(".head-actions");
          actions ? head.insertBefore(help, actions) : head.appendChild(help), setHeadHelp(null);
        }
        bindHeadHelp(document.getElementById("nx-shell"));
      }
      e === t.uiRenderGen && va();
    }
  } catch {
  } finally {
    t._uiRendering = !1;
  }
  }
  function wa() {
    document.getElementById("nx-close")?.addEventListener("click", async () => {
      try {
        await flushSettingsSave();
      } catch {
      }
      t.uiOpen = !1, t._debugTabTimer && (clearInterval(t._debugTabTimer), t._debugTabTimer = null), t._hostReaper && (clearInterval(t._hostReaper), t._hostReaper = null), t._settingsWatch && (clearInterval(t._settingsWatch), t._settingsWatch = null);
      try {
        await blockHostChrome(!1);
      } catch {
      }
      typeof k.hideContainer == "function" && await k.hideContainer(), invalidateOverlayLayoutCache();
      try {
        await it();
        await he();
        Ce();
      } catch {
      }
    }), document.getElementById("nx-save-all")?.addEventListener("click", async () => {
      await xa();
    }), document.getElementById("nx-export-all")?.addEventListener("click", async () => {
      try {
        await flushSettingsSave();
        const e = await K("/v1/settings/export", { method: "GET" }), n = new Blob([String(e?.json || "")], { type: "application/json" }), o = URL.createObjectURL(n), a = document.createElement("a");
        a.href = o, a.download = `inlay-nexus-settings-${new Date().toISOString().slice(0, 10)}.json`, document.body.appendChild(a), a.click(), a.remove(), setTimeout(() => URL.revokeObjectURL(o), 1e3), $e("설정 내보내기 완료");
      } catch (e) {
        $e(`내보내기 실패: ${z(e?.message || e, 60)}`, !1);
      }
    }), document.getElementById("nx-import-all")?.addEventListener("click", () => {
      document.getElementById("nx-import-all-file")?.click();
    }), document.getElementById("nx-import-all-file")?.addEventListener("input", async (e) => {
      const n = e.target?.files?.[0];
      if (!n) return;
      try {
        await flushSettingsSave(), await K("/v1/settings/import", {
          method: "POST",
          body: { json: await n.text() }
        }), await le(), t.uiMessage = {
          type: "success",
          text: "전체 설정을 불러왔습니다"
        }, $e("설정 불러오기 완료"), await P(), await it();
      } catch (o) {
        t.uiMessage = {
          type: "error",
          text: `설정 불러오기 실패: ${z(o?.message || o)}`
        }, $e("설정 불러오기 실패", !1), await P();
      }
    });
    const e = document.getElementById("nx-tabs");
    if (e && !e.dataset.nxBound) {
      e.dataset.nxBound = "1";
      const n = (o) => {
        const a = o.target?.closest?.("[data-nx-tab]");
        if (!a || !e.contains(a)) return;
        const r = a.getAttribute("data-nx-tab");
        if (!r || r === t.uiTab) return;
        o.preventDefault(), o.stopPropagation(), t.uiTab = r;
        try {
          window.scrollTo?.(0, 0);
        } catch {
        }
        try {
          document.getElementById("nx-char-edit-modal")?.remove?.();
        } catch {
        }
        t.charEditUi = null, e.querySelectorAll("[data-nx-tab]").forEach((i) => {
          i.classList.toggle("active", i.getAttribute("data-nx-tab") === r);
        });
        if (r === "curation") {
          K("/v1/curation/status").then((st) => {
            t.curationStatus = st?.status || st;
            return P();
          }).catch(() => P());
        } else P();
      };
      e.addEventListener("pointerdown", n), e.addEventListener("click", n);
    }
    const n = document.getElementById("nx-shell");
    if (n && !n.dataset.nxAutosaveBound) {
      n.dataset.nxAutosaveBound = "1";
      const o = (a) => {
        if (t._uiRendering || !t.uiOpen) return;
        const r = a.target;
        if (!r?.id || !/^nx-/.test(r.id) || r.type === "button" || r.type === "file" || /(?:save|run-now|open-viewer|close|export|import|test-|preset-file|preset-select|scope-|refresh|debug)/.test(r.id)) return;
        if (!document.getElementById("nx-power") || !document.getElementById("nx-shell")?.isConnected) return;
        const i = {}, s = Mt(), c = Ct(), l = ba();
        (s || c) && (i.card = {
          ...t.backendSettings?.card || {},
          ...s || {},
          ...c || {}
        }), l && (i.llm = l.llm, i.nai = l.nai), Object.keys(i).length && queueSettingsSave(i);
      };
      n.addEventListener("input", o), n.addEventListener("click", (a) => {
        const r = a.target;
        (r?.type === "checkbox" || r?.tagName === "SELECT") && o(a);
      });
    }
  }
  /** Per-chat session ids for the current Risu character (unified view roots). */
  function rootChatSessionIds(scope) {
    const e = scope || t.lastScope;
    if (!e?.characterId) return [];
    const n = (t.charCatalog || []).find((s) => Number(s.index) === Number(e.charIndex)) || (t.charCatalog || []).find((s) => w(s.chaId || "") === w(e.characterId || "")) || null;
    const out = [];
    for (const s of n?.chats || []) {
      const c = w(s.id || `chat_${s.index}`);
      out.push(`risu_${ye(`${e.characterId}|${c}`)}`);
    }
    return out;
  }
  /** @deprecated alias — use rootChatSessionIds */
  function cascadeChatSessionIds(scope) {
    return rootChatSessionIds(scope);
  }
  function withRootSessions(body, scope) {
    const e = scope || t.lastScope;
    const unified = !!(e?.unified || e?.chatIndex === "unified" || t.scopeOverride?.chatIndex === "unified");
    if (!unified) return body;
    const ids = rootChatSessionIds(e);
    if (ids.length) body.root_session_ids = ids;
    return body;
  }
  async function ensureUnifiedRoster(e) {
    if (!e?.unified || !e.characterId || !e.sessionId) return null;
    try {
      await ia();
    } catch {
    }
    const o = rootChatSessionIds(e);
    // Rebuild display cache from live chat roots only (do not seed from stale unified rows).
    const a = await K("/v1/characters/unify", {
      method: "POST",
      body: {
        target_session_id: e.sessionId,
        source_session_ids: o,
        include_target: !1
      }
    }, 2e4);
    return t.charactersSession = a?.characters || t.charactersSession, t.charactersGlobal = a?.global || t.charactersGlobal, t.appearance = a?.appearance || t.appearance, y("info", "scope.unified", `sources=${o.length} merged=${a?.merged ?? "?"}`), a;
  }
  /** Load characters for a session without swapping the live gallery. */
  async function loadRosterCharactersOnly(sessionId) {
    const n = w(sessionId || "", 200);
    if (!n) return;
    try {
      const charId = w(t.lastScope?.characterId || "", 200), a = await K(`/v1/characters?session_id=${encodeURIComponent(n)}${charId ? `&character_id=${encodeURIComponent(charId)}` : ""}`, { method: "GET" });
      t.charactersSession = a?.characters || [], t.charactersGlobal = a?.global || t.charactersGlobal || [], t.disabledGlobals = Array.isArray(a?.disabled_globals) ? a.disabled_globals : t.disabledGlobals || [], t.appearance = a?.appearance || t.appearance || {};
    } catch (err) {
      y("warn", "roster.load", err?.message || err);
    }
  }
  /**
   * When unified_chat_priority is ON, viewer chip/modals use the unified roster
   * (same tags generation uses). Gallery stays on the live chat session.
   */
  async function resolveViewerRosterSession() {
    const live = await Z({ useOverride: !1 }).catch(() => null);
    if (!live) return null;
    const preferUnified = !!(t.backendSettings?.card?.unified_chat_priority);
    if (!preferUnified || !live.characterId) {
      t._viewerRoster = { ...live, rosterSessionId: live.sessionId, rosterUnified: !1, unifiedScope: null };
      return t._viewerRoster;
    }
    const unifiedScope = {
      ...live,
      unified: !0,
      chatIndex: "unified",
      chatId: "__unified__",
      chatName: "통합 챗",
      sessionId: live.unifiedSessionId || `risu_${ye(`${live.characterId}|__unified__`)}`,
      liveChat: !1
    };
    try {
      await ensureUnifiedRoster(unifiedScope);
    } catch (err) {
      y("warn", "roster.unify", err?.message || err);
    }
    t._viewerRoster = { ...live, rosterSessionId: unifiedScope.sessionId, rosterUnified: !0, unifiedScope };
    return t._viewerRoster;
  }
  async function ensureViewerRosterLoaded() {
    const resolved = await resolveViewerRosterSession();
    if (!resolved?.rosterSessionId) return null;
    await loadRosterCharactersOnly(resolved.rosterSessionId);
    return resolved;
  }
  async function switchSettingsScope(e, n) {
    const o = e === "live" || e == null, unified = n === "unified", a = !unified && (n === "live" || n == null);
    o && a ? t.scopeOverride = null : t.scopeOverride = {
      charIndex: o ? "live" : Number(e),
      chatIndex: unified ? "unified" : a ? "live" : Number(n)
    }, t.selectedMessage = null, t.lastImagedMessage = null;
    try {
      await ia();
      const r = t.lastScope?.sessionId || "", i = await Z({ useOverride: !0 });
      i.unified && await ensureUnifiedRoster(i), await ce(i.sessionId, !0), t.gallerySessionId = i.sessionId || "";
    } catch (r) {
      t.uiMessage = {
        type: "error",
        text: z(r?.message || r)
      };
    }
    await P();
  }

  function defaultChatScopeForCharChange() {
    return t.backendSettings?.card?.unified_chat_priority ? "unified" : "live";
  }

  function bindScopeSelectHandlers() {
    const onChar = async () => {
      const a = N("nx-scope-char");
      if (a === "live") {
        await switchSettingsScope("live", defaultChatScopeForCharChange());
        return;
      }
      const r = Number(a);
      !Number.isFinite(r) || r < 0 || await switchSettingsScope(r, defaultChatScopeForCharChange());
    }, onChat = async () => {
      const a = N("nx-scope-char"), r = N("nx-scope-chat"), i = a === "live" ? "live" : Number(a);
      if (!(i !== "live" && (!Number.isFinite(i) || i < 0))) {
        if (r === "unified") {
          await switchSettingsScope(i, "unified");
          return;
        }
        if (r === "live") {
          await switchSettingsScope(i, "live");
          return;
        }
        const s = Number(r);
        await switchSettingsScope(i, Number.isFinite(s) ? s : 0);
      }
    };
    const charEl = document.getElementById("nx-scope-char"), chatEl = document.getElementById("nx-scope-chat");
    charEl && (charEl.addEventListener("change", onChar), charEl.addEventListener("input", onChar));
    chatEl && (chatEl.addEventListener("change", onChat), chatEl.addEventListener("input", onChat));
  }

  function va() {
    bindScopeSelectHandlers(), document.getElementById("nx-unified-priority")?.addEventListener("change", async () => {
      try {
        const a = Mt();
        t.backendSettings && (t.backendSettings.card = {
          ...t.backendSettings.card,
          ...a
        });
      } catch {
      }
      await P();
    }), document.getElementById("nx-save-dash")?.addEventListener("click", async () => {
      try {
        await flushSettingsSave(), await pe({ card: Mt() }), invalidateOverlayLayoutCache(), t.uiMessage = {
          type: "success",
          text: "대시보드 저장됨"
        }, $e("저장됨"), await it();
        try {
          await he();
        } catch {
        }
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        };
      }
      await P();
    }), document.getElementById("nx-reset-windows")?.addEventListener("click", async () => {
      try {
        await flushSettingsSave(), await resetAllWindowPositions(), t.uiMessage = {
          type: "success",
          text: "모든 창 위치를 기본값으로 되돌렸습니다 (사라졌을 때용)"
        }, $e("위치 초기화");
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a?.message || a)
        };
      }
      await P();
    }), document.getElementById("nx-reset-settings")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("정말로 모든 설정을 기본값으로 초기화할까요?\n\n유지: API 키 · 창 위치 · 카드 프리셋(pos/neg)\n초기화: 그 외 카드/LLM/NAI 설정")) return;
      try {
        await flushSettingsSave();
        const a = await K("/v1/settings/reset", { method: "POST", body: {} });
        t.backendSettings = a?.settings || t.backendSettings;
        t.activePresetId = String(t.backendSettings?.card?.active_preset_id || "");
        t.settingsSavePending = null, t.uiMessage = {
          type: "success",
          text: "모든 설정을 기본값으로 되돌렸습니다 (프리셋·API 키 유지)"
        }, $e("설정 초기화");
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a?.message || a)
        };
      }
      await P(), await it();
    }), document.getElementById("nx-inline-pct")?.addEventListener("input", () => {
      const a = Math.max(1, Ne(N("nx-inline-pct"), 100));
      t.backendSettings || (t.backendSettings = {}), t.backendSettings.card || (t.backendSettings.card = {}), t.backendSettings.card.inline_thumb_pct = a, invalidateOverlayLayoutCache();
    }), (() => {
      const saveCard = async () => {
        try {
          const a = Ct();
          await flushSettingsSave(), await pe({ card: a }), t.uiMessage = {
            type: "success",
            text: `카드 설정 저장됨 · 프리셋 ${(a.presets || []).length}개 · char≤${a.character_max}`
          }, $e("저장됨");
        } catch (a) {
          t.uiMessage = {
            type: "error",
            text: z(a.message || a)
          };
        }
        await P();
      };
      document.getElementById("nx-save-card")?.addEventListener("click", saveCard);
      document.getElementById("nx-save-card-head")?.addEventListener("click", saveCard);
    })();
    const e = async (a) => {
      if (!a) return;
      await applyActivePreset(a);
    };
    document.getElementById("nx-preset-select")?.addEventListener("change", async (a) => {
      await e(a.target?.value || "");
    }), (() => {
      const row = document.querySelector(".preset-chip-row");
      let dragId = "", moved = !1;
      document.querySelectorAll("[data-preset-select]").forEach((a) => {
        a.addEventListener("click", async (ev) => {
          ev.preventDefault(), ev.stopPropagation();
          if (moved) {
            moved = !1;
            return;
          }
          await e(a.getAttribute("data-preset-select") || "");
        });
        a.addEventListener("dragstart", (ev) => {
          dragId = a.getAttribute("data-preset-select") || "";
          moved = !1;
          a.classList.add("dragging");
          try {
            ev.dataTransfer?.setData("text/plain", dragId);
            ev.dataTransfer.effectAllowed = "move";
          } catch {
          }
        });
        a.addEventListener("dragend", () => {
          a.classList.remove("dragging");
          document.querySelectorAll(".preset-chip.drag-over").forEach((el) => el.classList.remove("drag-over"));
          dragId = "";
        });
        a.addEventListener("dragover", (ev) => {
          ev.preventDefault();
          a.classList.add("drag-over");
        });
        a.addEventListener("dragleave", () => a.classList.remove("drag-over"));
        a.addEventListener("drop", async (ev) => {
          ev.preventDefault(), ev.stopPropagation();
          a.classList.remove("drag-over");
          const from = dragId || ev.dataTransfer?.getData("text/plain") || "";
          const to = a.getAttribute("data-preset-select") || "";
          if (!from || !to || from === to) return;
          moved = !0;
          const card = kt(t.backendSettings?.card || {});
          const EX = globalThis.__INLAY_EXPLORER__;
          const ids = (card.presets || []).map((p) => p.id);
          const fromIdx = ids.findIndex((id) => presetIdEq(id, from));
          const toIdx = ids.findIndex((id) => presetIdEq(id, to));
          if (fromIdx < 0 || toIdx < 0) return;
          const nextIds = [...ids];
          const [picked] = nextIds.splice(fromIdx, 1);
          nextIds.splice(toIdx, 0, picked);
          card.presets = EX?.reorderByIds ? EX.reorderByIds(card.presets, nextIds) : nextIds.map((id) => card.presets.find((p) => presetIdEq(p.id, id))).filter(Boolean);
          if (row) {
            nextIds.forEach((id) => {
              const el = [...row.querySelectorAll("[data-preset-select]")].find((node) => presetIdEq(node.getAttribute("data-preset-select"), id));
              el && row.appendChild(el);
            });
          }
          try {
            await pe({ card });
            $e("프리셋 순서 저장");
            const sel = document.getElementById("nx-preset-select");
            if (sel) {
              const active = resolveActivePresetId(card);
              sel.innerHTML = (card.presets || []).map((g) => `<option value="${h(g.id)}" ${presetIdEq(g.id, active) ? "selected" : ""}>${h(g.name)}</option>`).join("") || '<option value="">(프리셋 없음)</option>';
            }
          } catch (err) {
            t.uiMessage = { type: "error", text: z(err?.message || err) }, await P();
          }
        });
      });
    })(), document.getElementById("nx-preset-new")?.addEventListener("click", async () => {
      const a = _e(), r = `preset_${Date.now()}`;
      a.presets.push({
        id: r,
        name: `새 프리셋 ${a.presets.length + 1}`,
        positive: "",
        negative: "",
        cfg_scale: null,
        cfg_rescale: null
      }), pinActivePreset(a, r), a.custom_pos = "", a.custom_neg = "", queueSettingsSave({ card: { ...a } }), await P();
    }), document.getElementById("nx-preset-dup")?.addEventListener("click", async () => {
      const a = _e(), r = a.presets.find((s) => presetIdEq(s.id, a.active_preset_id));
      if (!r) return;
      const i = `preset_${Date.now()}`;
      a.presets.push({
        id: i,
        name: `${r.name} 복사`,
        positive: r.positive || "",
        negative: r.negative || "",
        cfg_scale: r.cfg_scale ?? null,
        cfg_rescale: r.cfg_rescale ?? null
      }), pinActivePreset(a, i), a.custom_pos = r.positive || "", a.custom_neg = r.negative || "";
      try {
        await K("/v1/nai/vibe", { method: "POST", body: { preset_id: i, copy_from: r.id } }, 6e4);
      } catch {
      }
      queueSettingsSave({ card: { ...a } }), await P();
    }), document.getElementById("nx-preset-del")?.addEventListener("click", async () => {
      const a = _e();
      if (!a.presets.length) return;
      const delId = a.active_preset_id;
      a.presets = a.presets.filter((i) => !presetIdEq(i.id, a.active_preset_id));
      const nextId = a.presets[0]?.id || "";
      pinActivePreset(a, nextId);
      const r = a.presets[0];
      a.custom_pos = r?.positive || "", a.custom_neg = r?.negative || "";
      try {
        delId && await K("/v1/nai/vibe/clear", { method: "POST", body: { preset_id: delId } });
      } catch {
      }
      queueSettingsSave({ card: { ...a } }), await P();
    }), document.getElementById("nx-preset-export")?.addEventListener("click", async () => {
      try {
        const a = exportPresetsJson();
        t.uiMessage = {
          type: "success",
          text: `프리셋 JSON 내보내기 · ${a}개`
        }, $e("프리셋 내보내기 완료");
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: `내보내기 실패: ${z(a?.message || a)}`
        };
      }
      await P();
    }), document.getElementById("nx-preset-vibe-pick")?.addEventListener("click", () => {
      document.getElementById("nx-preset-vibe-file")?.click();
    }), document.getElementById("nx-preset-vibe-file")?.addEventListener("change", async (a) => {
      const r = a.target?.files?.[0], pid = String(t.backendSettings?.card?.active_preset_id || "");
      if (r && pid) {
        try {
          const res = await K("/v1/nai/vibe", {
            method: "POST",
            body: {
              preset_id: pid,
              image_b64: await It(r),
              information_extracted: Number(N("nx-nai-vibe-ie") || 1),
              strength: Number(N("nx-nai-vibe-strength") || 0.6)
            }
          }, 12e4);
          const s = document.getElementById("nx-preset-vibe-status");
          s && (s.textContent = "설정됨 · 이 프리셋 사용");
          const c = document.getElementById("nx-preset-vibe-preview");
          const url = res?.preview_url || "";
          c && (c.innerHTML = url ? `<img src="${h(url)}" alt="vibe">` : '<span class="muted">설정됨</span>');
          const card = t.backendSettings?.card, pr = (card?.presets || []).find((p) => presetIdEq(p.id, pid));
          pr && (pr.vibe_configured = !0, pr.vibe_preview_url = url);
          $e("프리셋 Vibe 저장");
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i?.message || i)
          }, await P();
        }
        a.target.value = "";
      }
    }), document.getElementById("nx-preset-vibe-clear")?.addEventListener("click", async () => {
      const pid = String(t.backendSettings?.card?.active_preset_id || "");
      if (!pid) return;
      try {
        await K("/v1/nai/vibe/clear", { method: "POST", body: { preset_id: pid } });
        const s = document.getElementById("nx-preset-vibe-status");
        s && (s.textContent = "없음 · NAI 모델설정 사용");
        const c = document.getElementById("nx-preset-vibe-preview");
        c && (c.innerHTML = '<span class="muted">없음 · 생성 시 NAI 모델설정 vibe 사용</span>');
        const card = t.backendSettings?.card, pr = (card?.presets || []).find((p) => presetIdEq(p.id, pid));
        pr && (pr.vibe_configured = !1, delete pr.vibe_preview_url);
        $e("프리셋 Vibe 제거");
      } catch (i) {
        t.uiMessage = {
          type: "error",
          text: z(i?.message || i)
        }, await P();
      }
    }), document.getElementById("nx-preset-file")?.addEventListener("click", () => {
      document.getElementById("nx-preset-file-input")?.click();
    }), document.getElementById("nx-preset-file-input")?.addEventListener("change", async (a) => {
      const r = a.target?.files?.[0];
      if (r) {
        try {
          const i = St(await r.text());
          t.uiMessage = {
            type: "success",
            text: `${r.name}에서 프리셋 ${i}개 가져옴 · 저장을 누르세요`
          };
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i.message || i)
          };
        }
        a.target.value = "", await P();
      }
    });
    const n = async (a, r = "붙여넣기") => {
      const i = St(a);
      t.uiMessage = {
        type: "success",
        text: `${r}에서 프리셋 ${i}개 가져옴 · 저장을 누르세요`
      };
      const s = document.getElementById("nx-preset-import-text");
      s && (s.value = ""), await P();
    };
    document.getElementById("nx-preset-import")?.addEventListener("click", async () => {
      try {
        await n(N("nx-preset-import-text"), "붙여넣기");
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        }, await P();
      }
    }), document.getElementById("nx-preset-import-text")?.addEventListener("paste", (a) => {
      setTimeout(async () => {
        const r = N("nx-preset-import-text");
        if (!(!r || r.length < 40) && !(!/\[Positive\]/i.test(r) && !/"character_book"|"presets"/i.test(r)))
          try {
            await n(r, "자동 감지");
          } catch (i) {
            t.uiMessage = {
              type: "error",
              text: z(i.message || i)
            }, await P();
          }
      }, 0);
    }), document.getElementById("nx-llm-source")?.addEventListener("change", async () => {
      try {
        const draft = Oe();
        t.backendSettings = t.backendSettings || {};
        t.backendSettings.llm = {
          ...(t.backendSettings.llm || {}),
          ...draft.llm,
          api_key: undefined,
          service_account_json: undefined,
          api_key_configured: t.backendSettings.llm?.api_key_configured,
          service_account_configured: t.backendSettings.llm?.service_account_configured
        };
      } catch {
      }
      await P();
    }), document.getElementById("nx-llm-provider")?.addEventListener("change", async (ev) => {
      const LH = globalThis.__INLAY_LLM__ || {}, provider = String(ev?.target?.value || "custom"), endpointEl = document.getElementById("nx-llm-endpoint"), modelEl = document.getElementById("nx-llm-model"), regionEl = document.getElementById("nx-llm-vertex-region"), nextEndpoint = LH.defaultEndpointForProvider?.(provider, { region: regionEl?.value || "us-central1" }) || "", known = LH.shouldAutoReplaceEndpoint?.(endpointEl?.value);
      if (endpointEl && (known || !String(endpointEl.value || "").trim())) endpointEl.value = provider === "vertex" ? "" : nextEndpoint;
      if (modelEl && (!modelEl.value || ["openai/gpt-oss-20b:nitro", "gpt-4o-mini", "gemini-2.5-flash"].includes(modelEl.value))) {
        const ph = LH.llmModelPlaceholder?.(provider);
        if (ph) modelEl.placeholder = ph;
      }
      // Re-render models tab so Vertex/Anthropic/Reasoning fields toggle.
      try {
        const draft = Oe();
        t.backendSettings = t.backendSettings || {};
        t.backendSettings.llm = {
          ...(t.backendSettings.llm || {}),
          ...draft.llm,
          api_key: undefined,
          service_account_json: undefined,
          api_key_configured: t.backendSettings.llm?.api_key_configured,
          service_account_configured: t.backendSettings.llm?.service_account_configured
        };
      } catch {
      }
      await P();
    }), document.getElementById("nx-llm-vertex-region")?.addEventListener("change", () => {
      const LH = globalThis.__INLAY_LLM__ || {}, provider = N("nx-llm-provider"), endpointEl = document.getElementById("nx-llm-endpoint"), region = N("nx-llm-vertex-region") || "us-central1";
      if (provider === "vertex" && endpointEl && LH.shouldAutoReplaceEndpoint?.(endpointEl.value)) {
        endpointEl.value = LH.defaultEndpointForProvider?.("vertex", { region }) || "";
      }
    }), document.querySelectorAll("[data-nx-curation-mode]").forEach((btn) => btn.addEventListener("click", async () => {
      const mode = btn.getAttribute("data-nx-curation-mode") || "off";
      try {
        await K("/v1/curation/settings", { method: "POST", body: { mode } });
        if (!t.backendSettings.curation) t.backendSettings.curation = {};
        t.backendSettings.curation.mode = mode;
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    })), document.getElementById("nx-curation-strict-ids")?.addEventListener("change", async (ev) => {
      const strict_ids = !!ev?.target?.checked;
      try {
        await K("/v1/curation/settings", { method: "POST", body: { strict_ids } });
        if (!t.backendSettings.curation) t.backendSettings.curation = {};
        t.backendSettings.curation.strict_ids = strict_ids;
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-emb-provider")?.addEventListener("change", (ev) => {
      const EH = globalThis.__INLAY_EMBED__ || {};
      const provider = EH.normalizeEmbeddingProvider?.(ev?.target?.value) || String(ev?.target?.value || "openai");
      const endpointEl = document.getElementById("nx-curation-emb-endpoint");
      const modelEl = document.getElementById("nx-curation-emb-model");
      const nextEndpoint = EH.defaultEndpointForEmbedding?.(provider) || "";
      const nextModel = EH.defaultModelForEmbedding?.(provider) || EH.embeddingModelPlaceholder?.(provider) || "";
      if (endpointEl && (EH.shouldAutoReplaceEmbeddingEndpoint?.(endpointEl.value) !== !1 || !String(endpointEl.value || "").trim())) {
        endpointEl.value = nextEndpoint;
        endpointEl.placeholder = nextEndpoint;
      }
      if (modelEl) {
        if (EH.shouldAutoReplaceEmbeddingModel?.(modelEl.value) !== !1 || !String(modelEl.value || "").trim()) {
          modelEl.value = nextModel;
        }
        modelEl.placeholder = nextModel;
      }
    }), document.getElementById("nx-curation-save")?.addEventListener("click", async () => {
      try {
        const embedding = {
          provider: N("nx-curation-emb-provider") || "openai",
          model: N("nx-curation-emb-model"),
          endpoint: N("nx-curation-emb-endpoint"),
        };
        const key = N("nx-curation-emb-key");
        if (key) embedding.api_key = key;
        await K("/v1/curation/settings", { method: "POST", body: { embedding } });
        const st = await K("/v1/curation/status");
        t.curationStatus = st?.status || st;
        if (t.backendSettings) {
          if (!t.backendSettings.curation) t.backendSettings.curation = {};
          t.backendSettings.curation.embedding = {
            ...(t.backendSettings.curation.embedding || {}),
            provider: embedding.provider,
            model: embedding.model,
            endpoint: embedding.endpoint,
            api_key_configured: !!(key || t.backendSettings.curation.embedding?.api_key_configured),
          };
        }
        t.uiMessage = { type: "success", text: "큐레이팅 설정 저장됨" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-catalog-file")?.addEventListener("change", async (ev) => {
      const file = ev?.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const catalog = JSON.parse(text);
        const res = await K("/v1/curation/catalog", { method: "PUT", body: { catalog } });
        t.curationStatus = res?.status || t.curationStatus;
        t.uiMessage = { type: "success", text: "카탈로그 불러옴 (임베딩은 다시 생성하세요)" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-catalog-reset")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("카탈로그를 기본값(소형 SFW)으로 복원하고 임베딩을 지울까요?")) return;
      try {
        const res = await K("/v1/curation/catalog/reset", { method: "POST", body: {} });
        t.curationStatus = res?.status || t.curationStatus;
        t.uiMessage = { type: "success", text: "기본 카탈로그로 복원됨" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-curation-emb-test")?.addEventListener("click", async () => {
      const a = document.getElementById("nx-curation-emb-test"), r = document.getElementById("nx-test-result-curation_emb");
      a && (a.disabled = !0), r && (r.className = "test-result pending", r.textContent = "저장 후 테스트 중…");
      try {
        const embedding = {
          provider: N("nx-curation-emb-provider") || "openai",
          model: N("nx-curation-emb-model"),
          endpoint: N("nx-curation-emb-endpoint"),
        };
        const key = N("nx-curation-emb-key");
        if (key) embedding.api_key = key;
        const EH = globalThis.__INLAY_EMBED__ || {};
        const provider = EH.normalizeEmbeddingProvider?.(embedding.provider) || embedding.provider;
        if (!w(embedding.model)) throw new Error("임베딩 Model이 비어 있습니다.");
        if (EH.embeddingProviderNeedsApiKey?.(provider) !== !1) {
          const hasKey = !!(key || t.backendSettings?.curation?.embedding?.api_key_configured);
          if (!hasKey) throw new Error("임베딩 API key가 없습니다. (NovelAI/태깅 LLM 키가 아니라 임베딩용 키)");
        }
        await K("/v1/curation/settings", { method: "POST", body: { embedding } });
        if (t.backendSettings) {
          if (!t.backendSettings.curation) t.backendSettings.curation = {};
          t.backendSettings.curation.embedding = {
            ...(t.backendSettings.curation.embedding || {}),
            provider: embedding.provider,
            model: embedding.model,
            endpoint: embedding.endpoint,
            api_key_configured: !!(key || t.backendSettings.curation.embedding?.api_key_configured),
          };
        }
        const res = await K("/v1/curation/embed/test", { method: "POST", body: {} });
        const ok = !!res?.ok;
        const msg = ok ? `dims ${res?.dims ?? "?"} · ${res?.model || embedding.model || ""}` : (res?.message || "연결 실패");
        je("curation_emb", ok, msg);
        t.uiMessage = { type: ok ? "success" : "error", text: ok ? "임베딩 테스트 성공" : `임베딩 테스트 실패 · ${msg}` };
      } catch (err) {
        je("curation_emb", !1, err?.message || err);
        t.uiMessage = { type: "error", text: `임베딩 테스트 실패 · ${err?.message || err}` };
      } finally {
        a && (a.disabled = !1);
      }
      await P();
    }), document.getElementById("nx-curation-embed-run")?.addEventListener("click", async () => {
      const n = t.curationStatus?.option_count || "?";
      if (!globalThis.confirm?.(`카탈로그 ${n}개를 임베딩해 저장할까요?\n기존 벡터는 덮어씁니다.`)) return;
      const msg = document.getElementById("nx-curation-embed-msg");
      const bar = document.getElementById("nx-curation-embed-bar");
      let poll = 0;
      try {
        if (msg) msg.textContent = "임베딩 시작…";
        poll = globalThis.setInterval(async () => {
          try {
            const st = await K("/v1/curation/status");
            const p = st?.status?.embed_progress || st?.embed_progress;
            if (p && bar) {
              const pct = p.total ? Math.round(100 * (p.done || 0) / p.total) : 0;
              bar.style.width = pct + "%";
              if (msg) msg.textContent = p.message || (p.done + " / " + p.total);
            }
          } catch {
          }
        }, 400);
        const res = await K("/v1/curation/embed", { method: "POST", body: {} });
        globalThis.clearInterval(poll);
        t.curationStatus = res?.status || t.curationStatus;
        t.uiMessage = { type: "success", text: "임베딩 저장 완료" };
        await P();
      } catch (err) {
        globalThis.clearInterval(poll);
        t.uiMessage = { type: "error", text: String(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-save-models")?.addEventListener("click", async () => {
      try {
        const { llm: a, nai: r } = Oe(), llmSource = a.source === "main" || a.source === "aux" ? a.source : "custom";
        a.source = llmSource;
        const LH = globalThis.__INLAY_LLM__ || {}, provider = LH.normalizeLlmProvider?.(a.provider) || a.provider;
        if (llmSource === "custom") {
          if (!w(a.model)) {
            t.uiMessage = {
              type: "error",
              text: "태깅 LLM Model이 비어 있습니다."
            }, await P();
            return;
          }
          const hasKey = !!(a.api_key || t.backendSettings?.llm?.api_key_configured);
          const hasSa = !!(a.service_account_json || t.backendSettings?.llm?.service_account_configured) && !a.clearServiceAccount;
          if (provider === "vertex" ? !hasKey && !hasSa : !hasKey) {
            t.uiMessage = {
              type: "error",
              text: provider === "vertex" ? "Vertex AI Service Account JSON(또는 access token)을 입력하세요." : "태깅 LLM API key를 입력하세요. (NovelAI 키와 별개)"
            }, await P();
            return;
          }
        }
        await flushSettingsSave(), await pe({
          llm: a,
          nai: r
        }), t.uiMessage = {
          type: "success",
          text: llmSource === "main" ? "모델 설정 저장됨 · Risu 메인 모델" : llmSource === "aux" ? "모델 설정 저장됨 · Risu 보조 모델" : "모델 설정 저장됨"
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        };
      }
      await P();
    }), document.getElementById("nx-test-llm")?.addEventListener("click", async () => {
      const a = document.getElementById("nx-test-llm"), r = document.getElementById("nx-test-result-llm");
      a && (a.disabled = !0), r && (r.className = "test-result pending", r.textContent = "저장 후 테스트 중…");
      try {
        const { llm: i, nai: s } = Oe(), llmSource = i.source === "main" || i.source === "aux" ? i.source : "custom";
        i.source = llmSource;
        const LH = globalThis.__INLAY_LLM__ || {}, provider = LH.normalizeLlmProvider?.(i.provider) || i.provider;
        if (llmSource === "custom") {
          if (!w(i.model)) throw new Error("태깅 LLM Model이 비어 있습니다.");
          const hasKey = !!(i.api_key || t.backendSettings?.llm?.api_key_configured);
          const hasSa = !!(i.service_account_json || t.backendSettings?.llm?.service_account_configured) && !i.clearServiceAccount;
          if (provider === "vertex" ? !hasKey && !hasSa : !hasKey) {
            throw new Error(provider === "vertex" ? "Vertex AI Service Account JSON(또는 access token)이 없습니다." : "태깅 LLM API key가 없습니다. NovelAI 키가 아니라 태깅용 LLM 키를 넣으세요.");
          }
        }
        await flushSettingsSave(), await pe({
          llm: i,
          nai: s
        });
        const c = await K("/v1/models/test", {
          method: "POST",
          body: { llm: i }
        });
        je("llm", !!c?.ok, c?.message || (c?.ok ? "연결 성공" : "연결 실패")), t.uiMessage = {
          type: c?.ok ? "success" : "error",
          text: c?.ok ? "태깅 LLM 테스트 성공" : `태깅 LLM 테스트 실패 · ${z(c?.message || "")}`
        };
      } catch (i) {
        je("llm", !1, i.message || i), t.uiMessage = {
          type: "error",
          text: `태깅 LLM 테스트 실패 · ${z(i.message || i)}`
        };
      } finally {
        a && (a.disabled = !1);
      }
      await P();
    }), document.getElementById("nx-img-backend-bar")?.addEventListener("click", async (ev) => {
      const btn = ev.target?.closest?.("button[data-backend]");
      if (!btn) return;
      const next = btn.getAttribute("data-backend") === "comfy" ? "comfy" : "nai";
      const cur = ba();
      if (cur) {
        t.backendSettings = t.backendSettings || {};
        if (cur.llm) {
          delete cur.llm.api_key;
          delete cur.llm.service_account_json;
          t.backendSettings.llm = {
            ...(t.backendSettings.llm || {}),
            ...cur.llm,
            api_key_configured: t.backendSettings.llm?.api_key_configured,
            service_account_configured: t.backendSettings.llm?.service_account_configured
          };
        }
        if (cur.nai) {
          delete cur.nai.api_key;
          t.backendSettings.nai = {
            ...(t.backendSettings.nai || {}),
            ...cur.nai,
            backend: next,
            api_key_configured: t.backendSettings.nai?.api_key_configured,
            image_reference_configured: t.backendSettings.nai?.image_reference_configured,
            vibe_transfer_configured: t.backendSettings.nai?.vibe_transfer_configured,
            comfy_configured: t.backendSettings.nai?.comfy_configured
          };
        } else {
          t.backendSettings.nai = { ...(t.backendSettings.nai || {}), backend: next };
        }
      } else {
        t.backendSettings = t.backendSettings || {};
        t.backendSettings.nai = { ...(t.backendSettings.nai || {}), backend: next };
      }
      const hidden = document.getElementById("nx-img-backend");
      if (hidden) hidden.value = next;
      await P();
    }), document.getElementById("nx-comfy-wf-pick")?.addEventListener("click", () => {
      document.getElementById("nx-comfy-wf-file")?.click();
    }), document.getElementById("nx-comfy-wf-file")?.addEventListener("change", async (ev) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        JSON.parse(text);
        const ta = document.getElementById("nx-comfy-workflow");
        if (ta) ta.value = text;
        t.backendSettings = t.backendSettings || {};
        t.backendSettings.nai = {
          ...(t.backendSettings.nai || {}),
          backend: "comfy",
          comfy_workflow_json: text,
          comfy_configured: true
        };
        t.uiMessage = { type: "success", text: `워크플로 불러옴 · ${file.name}` };
      } catch (err) {
        t.uiMessage = { type: "error", text: `워크플로 JSON 오류 · ${z(err.message || err)}` };
      }
      ev.target.value = "";
      await P();
    }), document.getElementById("nx-test-nai")?.addEventListener("click", async () => {
      const a = document.getElementById("nx-test-nai"), r = document.getElementById("nx-test-result-nai");
      a && (a.disabled = !0), r && (r.className = "test-result pending", r.textContent = "저장 후 테스트 중…");
      try {
        const { llm: i, nai: s } = Oe();
        const backend = s.backend || t.backendSettings?.nai?.backend || "nai";
        if (backend === "comfy") {
          if (!w(s.comfy_workflow_json) && !w(t.backendSettings?.nai?.comfy_workflow_json)) throw new Error("ComfyUI 워크플로 JSON이 없습니다.");
        } else if (!s.api_key && !t.backendSettings?.nai?.api_key_configured) {
          throw new Error("Novel AI API key가 없습니다.");
        }
        await flushSettingsSave(), await pe({
          llm: i,
          nai: s
        });
        const c = await K("/v1/nai/test", {
          method: "POST",
          body: {}
        });
        const label = backend === "comfy" ? "ComfyUI" : "Novel AI";
        je("nai", !!c?.ok, c?.message || (c?.ok ? "연결 성공" : "연결 실패")), t.uiMessage = {
          type: c?.ok ? "success" : "error",
          text: c?.ok ? `${label} 테스트 성공` : `${label} 테스트 실패 · ${z(c?.message || "")}`
        };
      } catch (i) {
        je("nai", !1, i.message || i), t.uiMessage = {
          type: "error",
          text: `이미지 공급자 테스트 실패 · ${z(i.message || i)}`
        };
      } finally {
        a && (a.disabled = !1);
      }
      await P();
    }), document.getElementById("nx-debug-refresh")?.addEventListener("click", async () => {
      await P();
    }), document.getElementById("nx-debug-clear")?.addEventListener("click", async () => {
      t.debugLog = [], y("info", "debug.clear", "log cleared"), await P();
    }), document.getElementById("nx-debug-copy")?.addEventListener("click", async () => {
      const a = `${Ve()}

${Ye(250)}`;
      try {
        if (typeof navigator < "u" && navigator.clipboard?.writeText) await navigator.clipboard.writeText(a);
        else {
          const r = document.createElement("textarea");
          r.value = a, document.body.appendChild(r), r.select(), document.execCommand("copy"), r.remove();
        }
        t.uiMessage = {
          type: "success",
          text: "디버그 로그 복사됨"
        };
      } catch (r) {
        t.uiMessage = {
          type: "error",
          text: z(r.message || r)
        };
      }
      await P();
    }), document.getElementById("nx-debug-ping")?.addEventListener("click", async () => {
      y("info", "debug.ping", `uiOpen=${t.uiOpen} gallery=${(t.gallery || []).length}`);
      try {
        const a = await bt();
        y("info", "debug.health", a.ok ? `ok v${a.health?.version || "?"}` : a.error || "fail");
      } catch (a) {
        y("error", "debug.health", a?.message || a);
      }
      await P();
    }), document.getElementById("nx-run-now")?.addEventListener("click", async () => {
      try {
        const a = await Z(), r = await D("getChatFromIndex", () => k.getChatFromIndex(a.charIndex, a.chatIndex), null);
        a.chat = r;
        const i = Xe(r, 0, !1).slice(-1)[0];
        if (!i?.content) throw new Error("최근 캐릭터 메시지가 없습니다.");
        await Be(a, i.content, !0), t.uiMessage = {
          type: "success",
          text: "생성 job 시작"
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        };
      }
      await P();
    }), document.getElementById("nx-open-viewer")?.addEventListener("click", async () => {
      await Vt();
    }), document.getElementById("nx-refresh-chars")?.addEventListener("click", async () => {
      const a = await Z();
      a.unified && await ensureUnifiedRoster(a), await ce(a.sessionId), await P();
    }), document.getElementById("nx-unify-rebuild")?.addEventListener("click", async () => {
      try {
        const a = await Z();
        if (!a.unified) return;
        await ensureUnifiedRoster(a), await ce(a.sessionId), t.uiMessage = {
          type: "success",
          text: "통합 챗 캐릭터를 다시 모았습니다"
        }, await P();
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a?.message || a)
        }, await P();
      }
    }), document.getElementById("nx-char-add-session")?.addEventListener("click", async () => {
      const mergeCharLists = (fromDom, fromMem) => {
        const dom = Array.isArray(fromDom) ? fromDom : [];
        const mem = Array.isArray(fromMem) ? fromMem : [];
        const ids = new Set(dom.map((c) => String(c?.id || "")));
        const extras = mem.filter((c) => {
          const id = String(c?.id || "");
          return id && !ids.has(id) && (id.startsWith("new_") || id.startsWith("gnew_") || id.startsWith("tmp_"));
        });
        return [...dom, ...extras];
      };
      t.charactersSession = mergeCharLists(oe("session"), t.charactersSession);
      t.charactersGlobal = mergeCharLists(oe("global"), t.charactersGlobal);
      t.charactersSession = [...t.charactersSession, {
        id: `new_${Date.now()}`,
        name: "New Character",
        original: "",
        aliases: [],
        appearance: "",
        attire: "",
        accessories: ""
      }], t._charsDirty = !0, await P();
    }), document.getElementById("nx-char-add-global")?.addEventListener("click", async () => {
      const mergeCharLists = (fromDom, fromMem) => {
        const dom = Array.isArray(fromDom) ? fromDom : [];
        const mem = Array.isArray(fromMem) ? fromMem : [];
        const ids = new Set(dom.map((c) => String(c?.id || "")));
        const extras = mem.filter((c) => {
          const id = String(c?.id || "");
          return id && !ids.has(id) && (id.startsWith("new_") || id.startsWith("gnew_") || id.startsWith("tmp_"));
        });
        return [...dom, ...extras];
      };
      t.charactersSession = mergeCharLists(oe("session"), t.charactersSession);
      t.charactersGlobal = mergeCharLists(oe("global"), t.charactersGlobal);
      t.charactersGlobal = [...t.charactersGlobal, {
        id: `gnew_${Date.now()}`,
        name: "Global Character",
        original: "",
        aliases: [],
        appearance: "",
        attire: "",
        accessories: ""
      }], t._charsDirty = !0, await P();
    }), document.getElementById("nx-save-chars")?.addEventListener("click", async () => {
      try {
        const a = await Z(), r = oe("session"), i = await K("/v1/characters", {
          method: "POST",
          body: withRootSessions({
            session_id: a.sessionId,
            character_id: w(a.characterId || "", 200),
            characters: r
          }, a)
        });
        t.charactersSession = i?.characters || r, t.appearance = i?.appearance || {}, t._charsDirty = !1, t.uiMessage = {
          type: "success",
          text: a.unified ? "채팅 캐릭터 저장됨 · 원본 채팅에 반영" : "채팅 캐릭터 저장됨"
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        };
      }
      await P();
    }), document.getElementById("nx-save-global-chars")?.addEventListener("click", async () => {
      try {
        const a = await Z().catch(() => null), r = oe("global"), i = await K("/v1/characters", {
          method: "POST",
          body: {
            session_id: a?.sessionId || "",
            global: r
          }
        });
        t.charactersGlobal = i?.global || r, i?.characters && (t.charactersSession = i.characters), t._charsDirty = !1, t.uiMessage = {
          type: "success",
          text: "글로벌 캐릭터 저장됨"
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a.message || a)
        };
      }
      await P();
    }), document.getElementById("nx-export-session-chars")?.addEventListener("click", async () => {
      try {
        const n = await exportCharactersScope("session");
        t.uiMessage = {
          type: "success",
          text: `채팅 캐릭터 JSON 내보내기 · ${n}명`
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: `내보내기 실패: ${z(a?.message || a)}`
        };
      }
      await P();
    }), document.getElementById("nx-export-global-chars")?.addEventListener("click", async () => {
      try {
        const n = await exportCharactersScope("global");
        t.uiMessage = {
          type: "success",
          text: `글로벌 캐릭터 JSON 내보내기 · ${n}명`
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: `내보내기 실패: ${z(a?.message || a)}`
        };
      }
      await P();
    }), document.getElementById("nx-import-session-chars")?.addEventListener("click", () => {
      document.getElementById("nx-import-session-chars-file")?.click();
    }), document.getElementById("nx-import-global-chars")?.addEventListener("click", () => {
      document.getElementById("nx-import-global-chars-file")?.click();
    }), document.getElementById("nx-import-session-chars-file")?.addEventListener("input", async (e) => {
      const n = e.target?.files?.[0];
      if (e.target) e.target.value = "";
      if (!n) return;
      try {
        const r = await importCharactersFromFile(n, "session");
        t.uiMessage = {
          type: "success",
          text: `채팅 캐릭터 불러옴 · ${r.sessionCount}명${r.globalCount ? ` · 글로벌 ${r.globalCount}명` : ""}`
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: `불러오기 실패: ${z(a?.message || a)}`
        };
      }
      await P();
    }), document.getElementById("nx-import-global-chars-file")?.addEventListener("input", async (e) => {
      const n = e.target?.files?.[0];
      if (e.target) e.target.value = "";
      if (!n) return;
      try {
        const r = await importCharactersFromFile(n, "global");
        t.uiMessage = {
          type: "success",
          text: `글로벌 캐릭터 불러옴 · ${r.globalCount}명${r.sessionCount ? ` · 채팅 ${r.sessionCount}명` : ""}`
        };
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: `불러오기 실패: ${z(a?.message || a)}`
        };
      }
      await P();
    }), document.querySelectorAll("[data-char-delete]").forEach((a) => {
      const r = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      a.addEventListener("pointerdown", r), a.addEventListener("mousedown", r), a.addEventListener("click", async (i) => {
        r(i);
        const s = a.closest("[data-char-scope]");
        if (!s) return;
        const c = s.getAttribute("data-char-scope"), l = s.getAttribute("data-char-id") || "", nameHint = String(s.querySelector("[data-char-name]")?.value || "").trim();
        const matchGone = (p) => {
          const id = String(p?.id || p?.name || "");
          const nm = String(p?.name || "").trim();
          return id === l || (nameHint && nm === nameHint);
        };
        t.charactersSession = oe("session"), t.charactersGlobal = oe("global");
        const gone = c === "session"
          ? (t.charactersSession || []).find((p) => matchGone(p))
          : (t.charactersGlobal || []).find((p) => matchGone(p));
        c === "session" ? t.charactersSession = (t.charactersSession || []).filter((p) => !matchGone(p)) : t.charactersGlobal = (t.charactersGlobal || []).filter((p) => !matchGone(p));
        t._charsDirty = !0, s.remove();
        // Persist immediately so tag regen cannot resurrect from stale DB leftovers.
        // Unified view: delete matching identity from each root chat.
        try {
          const scope = await Z().catch(() => null);
          const body = withRootSessions({
            session_id: scope?.sessionId || "",
            character_id: scope?.characterId || "",
            unified_session_id: scope?.unifiedSessionId || ""
          }, scope);
          if (c === "session") {
            body.characters = t.charactersSession || [];
            if (gone && Array.isArray(body.root_session_ids) && body.root_session_ids.length) {
              body.root_delete = [{
                id: gone.id || l || "",
                name: gone.name || nameHint || "",
                aliases: Array.isArray(gone.aliases) ? gone.aliases : [],
                surname: gone.surname || "",
                given_name: gone.given_name || "",
                surname_variants: gone.surname_variants || [],
                given_name_variants: gone.given_name_variants || []
              }];
            }
          } else body.global = t.charactersGlobal || [];
          const res = await K("/v1/characters", {
            method: "POST",
            body
          }, 15e3);
          if (Array.isArray(res?.characters)) t.charactersSession = res.characters;
          if (Array.isArray(res?.global)) t.charactersGlobal = res.global;
          t._charsDirty = !1;
          t.uiMessage = {
            type: "success",
            text: scope?.unified && c === "session"
              ? `${nameHint || "캐릭터"} 삭제·저장됨 · 원본 채팅에서도 제거`
              : `${nameHint || "캐릭터"} 삭제·저장됨`
          };
        } catch (err) {
          t.uiMessage = {
            type: "error",
            text: `삭제 저장 실패: ${z(err?.message || err)}`
          };
        }
      });
    }), document.querySelectorAll("[data-char-scope] input, [data-char-scope] textarea").forEach((a) => {
      a.addEventListener("input", () => {
        t._charsDirty = !0;
        try {
          t.charactersSession = oe("session"), t.charactersGlobal = oe("global");
        } catch {
        }
      });
    }), document.querySelectorAll("[data-global-toggle]").forEach((a) => {
      a.addEventListener("click", (r) => r.stopPropagation()), a.addEventListener("change", async (r) => {
        r.preventDefault(), r.stopPropagation();
        const i = a.getAttribute("data-global-toggle") || "", s = !!a.checked, c = (t.charactersGlobal || []).find((p) => String(p.id || p.name || "") === i), l = new Set((t.disabledGlobals || []).map(String));
        if (c) {
          for (const p of [globalCharKey(c), w(c.name || "", 200), w(c.name || "", 200).toLowerCase()]) p && (s ? l.delete(p) : l.add(p));
        } else i && (s ? l.delete(i) : l.add(i));
        t.disabledGlobals = [...l];
        try {
          await saveGlobalToggles(), t.uiMessage = {
            type: "success",
            text: `${w(c?.name || i, 80)} · 현재 캐릭터 ${s ? "ON" : "OFF"}`
          }, await P();
        } catch (p) {
          t.uiMessage = {
            type: "error",
            text: z(p?.message || p)
          }, await P();
        }
      });
    }), document.querySelectorAll("[data-char-to-global]").forEach((a) => {
      const r = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      a.addEventListener("pointerdown", r), a.addEventListener("mousedown", r), a.addEventListener("click", async (i) => {
        r(i);
        const s = a.closest("[data-char-scope]");
        if (s)
          try {
            t.charactersSession = oe("session"), t.charactersGlobal = oe("global");
            const c = s.getAttribute("data-char-id") || "", l = (t.charactersSession || []).find((j) => String(j.id || j.name || "") === c) || {
              id: c || `g_${Date.now()}`,
              name: s.querySelector("[data-char-name]")?.value || "",
              original: s.querySelector("[data-char-original]")?.value || "",
              aliases: String(s.querySelector("[data-char-aliases]")?.value || "").split(/[,/\n]/).map((j) => j.trim()).filter(Boolean),
              appearance: s.querySelector("[data-char-appearance]")?.value || "",
              attire: s.querySelector("[data-char-attire]")?.value || "",
              accessories: s.querySelector("[data-char-accessories]")?.value || ""
            };
            if (!String(l.name || "").trim()) {
              t.uiMessage = {
                type: "error",
                text: "이름이 비어 있어 글로벌로 보낼 수 없습니다"
              }, await P();
              return;
            }
            const p = await Z().catch(() => null), m = l.id && !String(l.id).startsWith("tmp_") ? l.id : `g_${Date.now()}`, u = {
              ...l,
              id: m
            }, b = String(l.name || "").trim().toLowerCase(), C = (t.charactersSession || []).filter((j) => String(j.id || j.name || "") !== c), S = [...(t.charactersGlobal || []).filter((j) => {
              const d = String(j.id || j.name || "");
              return d !== c && d !== m && String(j.name || "").trim().toLowerCase() !== b;
            }), u];
            t.charactersSession = C, t.charactersGlobal = S, t._charsDirty = !0, t.uiMessage = {
              type: "success",
              text: `글로벌로 이동 · ${l.name}`
            }, await P();
            const E = await K("/v1/characters", {
              method: "POST",
              body: withRootSessions({
                session_id: p?.sessionId || "",
                character_id: w(p?.characterId || "", 200),
                characters: C,
                root_delete: [{
                  id: l.id || c || "",
                  name: l.name || "",
                  aliases: Array.isArray(l.aliases) ? l.aliases : [],
                  surname: l.surname || "",
                  given_name: l.given_name || "",
                  surname_variants: l.surname_variants || [],
                  given_name_variants: l.given_name_variants || []
                }],
                scope: "__global__",
                character: u
              }, p)
            });
            E?.global && (t.charactersGlobal = E.global), E?.characters && (t.charactersSession = E.characters), t._charsDirty = !1, await P();
          } catch (c) {
            t.uiMessage = {
              type: "error",
              text: z(c?.message || c)
            }, await P();
          }
      });
    }), document.querySelectorAll("[data-save-prompt]").forEach((a) => {
      a.addEventListener("click", async () => {
        const r = a.getAttribute("data-save-prompt"), i = document.getElementById(`nx-prompt-${r}`)?.value || "";
        t.promptDrafts[r] = i;
        try {
          await K(`/v1/prompts/${encodeURIComponent(r)}`, {
            method: "PUT",
            body: { text: i }
          }), t.uiMessage = {
            type: "success",
            text: `${r} 저장됨`
          };
        } catch (s) {
          t.uiMessage = {
            type: "error",
            text: z(s.message || s)
          };
        }
        await P();
      });
    }), document.querySelectorAll("[data-reset-prompt]").forEach((a) => {
      a.addEventListener("click", async () => {
        const r = a.getAttribute("data-reset-prompt");
        if (!globalThis.confirm?.(`정말로 "${r}" 프롬프트를 기본값으로 복원할까요?`)) return;
        try {
          await K(`/v1/prompts/${encodeURIComponent(r)}/reset`, {
            method: "POST",
            body: {}
          }), t.promptDrafts[r] = "", delete t.promptDrafts[r], t.uiMessage = {
            type: "success",
            text: `${r} 복원`
          }, await Je();
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i.message || i)
          };
        }
        await P();
      });
    }), document.querySelectorAll("[data-export-prompt]").forEach((a) => {
      a.addEventListener("click", () => {
        const r = a.getAttribute("data-export-prompt");
        if (!r) return;
        const text = document.getElementById(`nx-prompt-${r}`)?.value ?? t.promptDrafts[r] ?? "";
        const blob = new Blob([JSON.stringify({ key: r, text }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url, link.download = `inlay-prompt-${r}-${new Date().toISOString().slice(0, 10)}.json`, document.body.appendChild(link), link.click(), link.remove(), setTimeout(() => URL.revokeObjectURL(url), 1e3);
        t.uiMessage = { type: "success", text: `${r} JSON 내보내기` };
        P().catch(() => null);
      });
    }), document.querySelectorAll("[data-import-prompt]").forEach((a) => {
      a.addEventListener("click", () => {
        const r = a.getAttribute("data-import-prompt");
        if (!r) return;
        document.querySelector(`[data-import-prompt-file="${CSS.escape(r)}"]`)?.click();
      });
    }), document.querySelectorAll("[data-import-prompt-file]").forEach((a) => {
      a.addEventListener("change", async (ev) => {
        const r = a.getAttribute("data-import-prompt-file"), file = ev.target?.files?.[0];
        if (!r || !file) return;
        try {
          const parsed = JSON.parse(await file.text());
          let text = "";
          if (parsed && typeof parsed === "object") {
            if (typeof parsed.text === "string") text = parsed.text;
            else if (parsed.prompts && typeof parsed.prompts[r] === "string") text = parsed.prompts[r];
            else if (typeof parsed[r] === "string") text = parsed[r];
            else throw new Error("JSON에 text 필드가 없습니다");
          } else throw new Error("잘못된 JSON");
          const box = document.getElementById(`nx-prompt-${r}`);
          box && (box.value = text), t.promptDrafts[r] = text;
          await K(`/v1/prompts/${encodeURIComponent(r)}`, { method: "PUT", body: { text } });
          t.uiMessage = { type: "success", text: `${r} JSON 불러옴` };
          await Je(), await P();
        } catch (err) {
          t.uiMessage = { type: "error", text: z(err?.message || err) };
          await P();
        } finally {
          a.value = "";
        }
      });
    }), document.getElementById("nx-prompts-reset-defaults")?.addEventListener("click", async () => {
      if (!globalThis.confirm?.("작가의 노트를 제외한 모든 프롬프트를 기본값으로 복원할까요?")) return;
      try {
        await K("/v1/prompts/reset-defaults", { method: "POST", body: { keep_author_note: true } });
        t.promptDrafts = {};
        t.uiMessage = { type: "success", text: "프롬프트 기본값 복원 (작가 노트 유지)" };
        await Je(), await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-prompts-export")?.addEventListener("click", async () => {
      try {
        const res = await K("/v1/prompts/export", { method: "GET" });
        const blob = new Blob([JSON.stringify({ version: res?.version, prompts: res?.prompts || {} }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url, link.download = `inlay-prompts-${new Date().toISOString().slice(0, 10)}.json`, document.body.appendChild(link), link.click(), link.remove(), setTimeout(() => URL.revokeObjectURL(url), 1e3);
        t.uiMessage = { type: "success", text: "전체 프롬프트 JSON 내보내기" };
        await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        await P();
      }
    }), document.getElementById("nx-prompts-import")?.addEventListener("click", () => {
      document.getElementById("nx-prompts-import-file")?.click();
    }), document.getElementById("nx-prompts-import-file")?.addEventListener("change", async (ev) => {
      const file = ev.target?.files?.[0];
      if (!file) return;
      try {
        const json = await file.text();
        await K("/v1/prompts/import", { method: "POST", body: { json } });
        t.promptDrafts = {};
        t.uiMessage = { type: "success", text: "전체 프롬프트 JSON 불러옴" };
        await Je(), await P();
      } catch (err) {
        t.uiMessage = { type: "error", text: z(err?.message || err) };
        await P();
      } finally {
        ev.target.value = "";
      }
    }), document.getElementById("nx-nai-ref-pick")?.addEventListener("click", () => {
      document.getElementById("nx-nai-ref-file")?.click();
    }), document.getElementById("nx-nai-ref-file")?.addEventListener("change", async (a) => {
      const r = a.target?.files?.[0];
      if (r) {
        try {
          await K("/v1/nai/reference", {
            method: "POST",
            body: { image_b64: await It(r) }
          }, 6e4);
          const i = document.getElementById("nx-nai-ref");
          i && (i.value = "file");
          const s = document.getElementById("nx-nai-ref-status");
          s && (s.textContent = "설정됨");
          const c = document.getElementById("nx-nai-ref-preview");
          c && (c.innerHTML = `<img src="${h((globalThis.__INLAY_NATIVE__?.refPreviewUrl?.() || ""))}" alt="reference">`), $e("참조 이미지 저장"), await le();
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i?.message || i)
          }, await P();
        }
        a.target.value = "";
      }
    }), document.getElementById("nx-nai-ref-clear")?.addEventListener("click", async () => {
      try {
        await K("/v1/nai/reference/clear", {
          method: "POST",
          body: {}
        });
        const a = document.getElementById("nx-nai-ref");
        a && (a.value = "none"), $e("참조 제거"), await le(), await P();
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a?.message || a)
        }, await P();
      }
    }), document.getElementById("nx-nai-vibe-pick")?.addEventListener("click", () => {
      document.getElementById("nx-nai-vibe-file")?.click();
    }), document.getElementById("nx-nai-vibe-file")?.addEventListener("change", async (a) => {
      const r = a.target?.files?.[0];
      if (r) {
        try {
          await K("/v1/nai/vibe", {
            method: "POST",
            body: {
              image_b64: await It(r),
              information_extracted: Number(N("nx-nai-vibe-ie") || 1),
              strength: Number(N("nx-nai-vibe-strength") || 0.6)
            }
          }, 12e4);
          const i = document.getElementById("nx-nai-vibe");
          i && (i.value = "file");
          const s = document.getElementById("nx-nai-vibe-status");
          s && (s.textContent = "설정됨");
          const c = document.getElementById("nx-nai-vibe-preview");
          c && (c.innerHTML = `<img src="${h((globalThis.__INLAY_NATIVE__?.vibePreviewUrl?.() || ""))}" alt="vibe">`), $e("Vibe 인코딩 저장"), await le();
        } catch (i) {
          t.uiMessage = {
            type: "error",
            text: z(i?.message || i)
          }, await P();
        }
        a.target.value = "";
      }
    }), document.getElementById("nx-nai-vibe-clear")?.addEventListener("click", async () => {
      try {
        await K("/v1/nai/vibe/clear", {
          method: "POST",
          body: {}
        });
        const a = document.getElementById("nx-nai-vibe");
        a && (a.value = "none"), $e("Vibe 제거"), await le(), await P();
      } catch (a) {
        t.uiMessage = {
          type: "error",
          text: z(a?.message || a)
        }, await P();
      }
    }), document.getElementById("nx-explorer-refresh")?.addEventListener("click", async () => {
      await Et(!0), await P();
    }),     document.getElementById("nx-explorer-delete-folder")?.addEventListener("click", async () => {
      const a = t.explorer?.folderKey || "", r = (t.explorer?.folders || []).find((i) => i.key === a);
      if (!a || a === "__all__") {
        t.uiMessage = {
          type: "error",
          text: a === "__all__" ? "통합 보기에서는 폴더 삭제를 쓸 수 없습니다. 개별 폴더를 고르세요." : "삭제할 폴더가 없습니다"
        }, await P();
        return;
      }
      const i = `${r?.character_name || "Unknown"} / ${r?.chat_name || a}`;
      if (!confirm(`폴더 "${i}"의 이미지를 모두 삭제할까요?`)) return;
      try {
        await K("/v1/gallery/delete", {
          method: "POST",
          body: { folder_key: a }
        }), await Et(!0), await P();
      } catch (s) {
        t.uiMessage = {
          type: "error",
          text: z(s?.message || s)
        }, await P();
      }
    }), document.getElementById("nx-explorer-q")?.addEventListener("input", (a) => {
      ensureExplorerState().query = a.target?.value || "";
      clearTimeout(t._explorerQTimer), t._explorerQTimer = setTimeout(() => {
        const { items: r } = Ze(), i = document.querySelector(".explorer-grid");
        i && (i.innerHTML = `<div class="explorer-marquee" id="nx-explorer-marquee"></div>${et(r)}`), paintExplorerSelectionUi(), tt();
      }, 160);
    });
    document.getElementById("nx-explorer-sort")?.addEventListener("change", (a) => {
      ensureExplorerState().sort = a.target?.value || "newest";
      const { items: r } = Ze(), i = document.querySelector(".explorer-grid");
      i && (i.innerHTML = `<div class="explorer-marquee" id="nx-explorer-marquee"></div>${et(r)}`), paintExplorerSelectionUi(), tt();
    });
    document.getElementById("nx-explorer-thumb")?.addEventListener("change", (a) => {
      const EX = exHelpers();
      ensureExplorerState().thumb = a.target?.value || "m";
      const grid = document.querySelector(".explorer-grid");
      grid && grid.style.setProperty("--ex-thumb", `${EX.thumbMinWidth ? EX.thumbMinWidth(t.explorer.thumb) : 148}px`);
    });
    document.getElementById("nx-explorer-favonly")?.addEventListener("click", () => {
      const ex = ensureExplorerState();
      ex.favOnly = !ex.favOnly;
      const { items: r } = Ze(), i = document.querySelector(".explorer-grid");
      i && (i.innerHTML = `<div class="explorer-marquee" id="nx-explorer-marquee"></div>${et(r)}`), paintExplorerSelectionUi(), tt();
      $e(ex.favOnly ? "즐겨찾기만 보기" : "전체 보기");
    });
    document.getElementById("nx-explorer-export-folder")?.addEventListener("click", () => explorerExport("folder"));
    document.getElementById("nx-explorer-export-all")?.addEventListener("click", () => explorerExport("all"));
    document.getElementById("nx-explorer-export-sel")?.addEventListener("click", () => explorerExport("selection"));
    document.getElementById("nx-explorer-import")?.addEventListener("click", () => document.getElementById("nx-explorer-import-file")?.click());
    document.getElementById("nx-explorer-import-file")?.addEventListener("change", async (a) => {
      const file = a.target?.files?.[0];
      a.target.value = "";
      await explorerImportFile(file);
    });
    document.getElementById("nx-explorer-delete-sel")?.addEventListener("click", () => explorerDeleteSelected());
    document.getElementById("nx-explorer-clear-sel")?.addEventListener("click", () => {
      const EX = exHelpers();
      ensureExplorerState().selection = EX.clearSelection ? EX.clearSelection(t.explorer.selection) : { selected: new Set(), anchorId: "", focusId: "" };
      paintExplorerSelectionUi();
    });
    document.getElementById("nx-explorer-save-one")?.addEventListener("click", async () => {
      const id = ensureExplorerState().selection?.focusId || [...ensureExplorerState().selection?.selected || []][0];
      const card = (Ze().items || []).find((x) => x.id === id) || (t.explorer?.items || []).find((x) => x.id === id);
      if (!card) return $e("선택된 이미지가 없습니다", !1);
      const a = document.createElement("a");
      a.href = Ie(card);
      a.download = `${card.character_name || "inlay"}_msg${Number(card.message_index) >= 0 ? card.message_index + 1 : "x"}_s${Number(card.shot_index) + 1}.png`;
      a.click();
      $e("이미지 저장");
    });
    document.getElementById("nx-explorer-mobile-select")?.addEventListener("click", () => {
      const ex = ensureExplorerState();
      ex.mobileSelect = !ex.mobileSelect;
      paintExplorerSelectionUi();
      $e(ex.mobileSelect ? "선택모드 ON · 탭할 때마다 토글" : "선택모드 OFF");
    });
    document.getElementById("nx-explorer-ctx")?.querySelectorAll("[data-ex-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const act = btn.getAttribute("data-ex-act");
        const id = document.getElementById("nx-explorer-ctx")?.dataset?.id;
        const card = (t.explorer?.items || []).find((x) => x.id === id);
        hideExplorerCtx();
        if (act === "view") openExplorerLightbox(id);
        else if (act === "jump") await explorerJumpToMessage(card);
        else if (act === "save") {
          if (!card) return;
          const a = document.createElement("a");
          a.href = Ie(card), a.download = `${id}.png`, a.click();
        } else if (act === "zip") await explorerExport("selection");
        else if (act === "star") await explorerToggleFavorite(id);
        else if (act === "delete") {
          ensureExplorerState().selection.selected = new Set([id]);
          await explorerDeleteSelected();
        }
      });
    });
    if (!t._explorerCtxDocBound) {
      t._explorerCtxDocBound = !0;
      document.addEventListener("click", (ev) => {
        if (!ev.target?.closest?.("#nx-explorer-ctx")) hideExplorerCtx();
      });
    }
    const lb = document.getElementById("nx-explorer-lightbox");
    if (lb && !lb.dataset.nxBound) {
      lb.dataset.nxBound = "1";
      document.getElementById("nx-lb-close")?.addEventListener("click", closeExplorerLightbox);
      document.getElementById("nx-lb-prev")?.addEventListener("click", () => {
        t.explorer.lbIndex = Math.max(0, (t.explorer.lbIndex || 0) - 1);
        t.explorer.lbZoom = 1, t.explorer.lbPanX = 0, t.explorer.lbPanY = 0;
        t._explorerLbPaint?.();
      });
      document.getElementById("nx-lb-next")?.addEventListener("click", () => {
        const n = Ze().items.length;
        t.explorer.lbIndex = Math.min(n - 1, (t.explorer.lbIndex || 0) + 1);
        t.explorer.lbZoom = 1, t.explorer.lbPanX = 0, t.explorer.lbPanY = 0;
        t._explorerLbPaint?.();
      });
      document.getElementById("nx-lb-fav")?.addEventListener("click", async (ev) => {
        ev.stopPropagation();
        const card = Ze().items[t.explorer.lbIndex || 0];
        if (card?.id) await explorerToggleFavorite(card.id);
      });
      lb.addEventListener("click", (ev) => {
        if (!lb.classList.contains("show")) return;
        if (ev.target?.closest?.(".lb-bar, button, img")) return;
        closeExplorerLightbox();
      });
      const stage = lb.querySelector(".lb-stage");
      const imgEl = lb.querySelector("img");
      stage?.addEventListener("wheel", (ev) => {
        if (!lb.classList.contains("show")) return;
        ev.preventDefault();
        const zoomed = (t.explorer.lbZoom || 1) > 1.05;
        const wantZoom = ev.ctrlKey || ev.metaKey || zoomed;
        if (wantZoom) {
          const z = Math.max(1, Math.min(6, (t.explorer.lbZoom || 1) * (ev.deltaY > 0 ? 0.9 : 1.1)));
          t.explorer.lbZoom = z;
          if (z <= 1) t.explorer.lbPanX = 0, t.explorer.lbPanY = 0;
          t._explorerLbPaint?.();
          return;
        }
        const now = Date.now();
        if (now - (t._explorerLbWheelAt || 0) < 180) return;
        t._explorerLbWheelAt = now;
        const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
        if (!delta) return;
        if (delta > 0) document.getElementById("nx-lb-next")?.click();
        else document.getElementById("nx-lb-prev")?.click();
      }, { passive: !1 });
      let pan = null;
      imgEl?.addEventListener("pointerdown", (ev) => {
        if ((t.explorer.lbZoom || 1) <= 1) return;
        ev.stopPropagation();
        pan = { x: ev.clientX, y: ev.clientY, px: t.explorer.lbPanX || 0, py: t.explorer.lbPanY || 0 };
        imgEl.setPointerCapture?.(ev.pointerId);
      });
      imgEl?.addEventListener("pointermove", (ev) => {
        if (!pan) return;
        t.explorer.lbPanX = pan.px + (ev.clientX - pan.x);
        t.explorer.lbPanY = pan.py + (ev.clientY - pan.y);
        t._explorerLbPaint?.();
      });
      imgEl?.addEventListener("pointerup", () => {
        pan = null;
      });
      imgEl?.addEventListener("dblclick", (ev) => {
        ev.stopPropagation();
        t.explorer.lbZoom = (t.explorer.lbZoom || 1) > 1 ? 1 : 2.2;
        t.explorer.lbPanX = 0, t.explorer.lbPanY = 0;
        t._explorerLbPaint?.();
      });
      imgEl?.addEventListener("click", (ev) => ev.stopPropagation());
    }
    if (!t._explorerKeysBound) {
      t._explorerKeysBound = !0;
      document.addEventListener("keydown", async (ev) => {
        if (t.uiTab !== "explorer") return;
        const tag = (ev.target?.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        const EX = exHelpers(), lbOpen = document.getElementById("nx-explorer-lightbox")?.classList.contains("show");
        if (lbOpen) {
          if (ev.key === "Escape") return closeExplorerLightbox();
          if (ev.key === "ArrowLeft") return document.getElementById("nx-lb-prev")?.click();
          if (ev.key === "ArrowRight") return document.getElementById("nx-lb-next")?.click();
          return;
        }
        const { items } = Ze(), ids = items.map((x) => x.id), ex = ensureExplorerState();
        if (ev.key === "Escape") {
          ex.selection = EX.clearSelection ? EX.clearSelection(ex.selection) : ex.selection;
          hideExplorerCtx();
          paintExplorerSelectionUi();
          return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "a") {
          ev.preventDefault();
          ex.selection = EX.selectAll ? EX.selectAll(ex.selection, ids) : ex.selection;
          paintExplorerSelectionUi();
          return;
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "f") {
          ev.preventDefault();
          document.getElementById("nx-explorer-q")?.focus();
          return;
        }
        if (ev.key === "Delete" || ev.key === "Backspace") {
          ev.preventDefault();
          await explorerDeleteSelected();
          return;
        }
        if (ev.key === "Enter") {
          const id = ex.selection?.focusId || ids[0];
          if (id) openExplorerLightbox(id);
          return;
        }
        if (ev.key === " " || ev.key === "Spacebar") {
          ev.preventDefault();
          const id = ex.selection?.focusId || ids[0];
          if (!id) return;
          ex.selection = EX.applyExplorerClick ? EX.applyExplorerClick(ex.selection, id, { ids, index: ids.indexOf(id), ctrl: !0 }) : ex.selection;
          paintExplorerSelectionUi();
          return;
        }
        if (ev.key === "ArrowRight" || ev.key === "ArrowLeft" || ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          ev.preventDefault();
          const cols = Math.max(1, Math.floor((document.querySelector(".explorer-grid")?.clientWidth || 400) / (EX.thumbMinWidth ? EX.thumbMinWidth(ex.thumb) : 148)));
          let delta = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : ev.key === "ArrowDown" ? cols : -cols;
          const next = EX.moveFocus ? EX.moveFocus(ids, ex.selection?.focusId, delta) : ids[0];
          if (!next) return;
          if (ev.shiftKey) ex.selection = EX.applyExplorerClick ? EX.applyExplorerClick(ex.selection, next, { ids, index: ids.indexOf(next), shift: !0 }) : ex.selection;
          else if (ev.ctrlKey || ev.metaKey) {
            ex.selection.focusId = next;
          } else {
            ex.selection = EX.applyExplorerClick ? EX.applyExplorerClick(ex.selection, next, { ids, index: ids.indexOf(next) }) : ex.selection;
          }
          paintExplorerSelectionUi();
          document.querySelector(`[data-explorer-id="${CSS.escape(next)}"]`)?.scrollIntoView?.({ block: "nearest" });
        }
      });
    }
    const o = document.getElementById("nx-explorer-folders");
    if (o && !o.dataset.nxBound) {
      o.dataset.nxBound = "1";
      let a = 0;
      const r = (i) => {
        const s = i.target?.closest?.("[data-explorer-folder]");
        if (!s || !o.contains(s)) return;
        i.preventDefault(), i.stopPropagation();
        const c = Date.now();
        if (c - a < 200) return;
        const l = s.getAttribute("data-explorer-folder") || "";
        if (!l || l === t.explorer?.folderKey) return;
        a = c, ha(l);
      };
      o.addEventListener("pointerdown", r), o.addEventListener("mousedown", r), o.addEventListener("click", (i) => {
        i.target?.closest?.("[data-explorer-folder]") && (i.preventDefault(), i.stopPropagation());
      });
    }
    tt(), document.querySelectorAll("[data-char-autotag]").forEach((a) => {
      const r = (i) => {
        i.preventDefault(), i.stopPropagation();
      };
      a.addEventListener("pointerdown", r), a.addEventListener("mousedown", r), a.addEventListener("click", (i) => {
        r(i);
        const s = a.closest("[data-char-scope]");
        if (s) {
          if (t.autotagFocus && t.autotagFocus.scope === s.getAttribute("data-char-scope") && t.autotagFocus.id === (s.getAttribute("data-char-id") || "")) {
            vt(), t.autotagFocus = null;
            const c = s.querySelector("[data-autotag-status]");
            c && (c.className = "autotag-status muted", c.textContent = "오토태그: 버튼 클릭=대상 선택(노란 표시) · 더블클릭=파일");
            return;
          }
          Qe(s);
        }
      }), a.addEventListener("dblclick", (i) => {
        r(i);
        const s = a.closest("[data-char-scope]");
        if (!s) return;
        Qe(s);
        const c = document.createElement("input");
        c.type = "file", c.accept = "image/*", c.style.display = "none", document.body.appendChild(c), c.addEventListener("change", async () => {
          const l = c.files?.[0];
          c.remove(), l && await Tt(s, l);
        }), c.click();
      });
    }), t._autotagPasteBound || (t._autotagPasteBound = !0, window.addEventListener("paste", async (a) => {
      if (!t.autotagFocus || t.autotagFocus.scope === "modal" || !t.uiOpen || t.uiTab !== "characters") return;
      const r = Array.from(a.clipboardData?.items || []).find((p) => p.type.startsWith("image/"));
      if (!r) return;
      a.preventDefault();
      const i = r.getAsFile();
      if (!i) return;
      const s = String(t.autotagFocus.scope || ""), c = String(t.autotagFocus.id || ""), l = Array.from(document.querySelectorAll("[data-char-scope]")).find((p) => p.getAttribute("data-char-scope") === s && p.getAttribute("data-char-id") === c);
      l && await Tt(l, i);
    }));
  }

  async function blockHostChrome(e) {
    t._hostChromeBlocked = !!e;
    if (e) {
      // Hide host overlays while settings are open — do NOT destroy them (st/Wt),
      // or the floating viewer only comes back after closing settings.
      const hide = "position:fixed;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;visibility:hidden;";
      try {
        for (const ui of [t.galleryUi?.root, t.overlayUi?.root, t.debugUi?.root, t.galleryUi?.panel, t.overlayUi?.layer, t.overlayUi?.pinned, t.overlayUi?.preview]) {
          if (ui && typeof ui.setStyleAttribute == "function") await ui.setStyleAttribute(hide);
        }
      } catch {
      }
      return;
    }
    try {
      t.hostDoc = null;
      if (t.galleryUi?.root && typeof t.galleryUi.root.setStyleAttribute == "function") {
        await t.galleryUi.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:1;visibility:visible;");
      }
      if (t.overlayUi?.root && typeof t.overlayUi.root.setStyleAttribute == "function") {
        await t.overlayUi.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99980;pointer-events:none;opacity:1;visibility:visible;");
      }
      // layer/panel were hidden individually on open — restore or markers stay invisible forever.
      if (t.overlayUi?.layer && typeof t.overlayUi.layer.setStyleAttribute == "function") {
        await t.overlayUi.layer.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99971;pointer-events:none;opacity:1;visibility:visible;");
      }
      if (t.overlayUi?.pinned && typeof t.overlayUi.pinned.setStyleAttribute == "function") {
        await t.overlayUi.pinned.setStyleAttribute("position:fixed;display:none;z-index:99997;pointer-events:auto;padding:0;margin:0;background:transparent;opacity:1;visibility:visible;");
      }
      if (t.overlayUi?.preview && typeof t.overlayUi.preview.setStyleAttribute == "function") {
        await t.overlayUi.preview.setStyleAttribute("position:fixed;display:none;z-index:99992;width:220px;pointer-events:none;border-radius:12px;overflow:hidden;opacity:1;visibility:visible;");
      }
      if (t.overlayUi?.fullscreen && typeof t.overlayUi.fullscreen.setStyleAttribute == "function") {
        await t.overlayUi.fullscreen.setStyleAttribute("position:fixed;inset:0;display:none;z-index:100001;pointer-events:auto;opacity:1;visibility:visible;");
      }
      if (t.debugUi?.root && typeof t.debugUi.root.setStyleAttribute == "function") {
        await t.debugUi.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99986;pointer-events:none;opacity:1;visibility:visible;");
      }
      if (t.galleryUi?.applyChrome) await t.galleryUi.applyChrome();
      else if (t.galleryUi?.paintStatus) await t.galleryUi.paintStatus();
      invalidateOverlayLayoutCache();
      await it();
      try {
        await he();
      } catch {
      }
      Ce();
    } catch {
    }
  }

  async function At() {
    t.uiOpen = !0;
    // Re-open settings with whatever the viewer last selected.
    try {
      if (t.backendSettings?.card) {
        const id = resolveActivePresetId(t.backendSettings.card);
        id && pinActivePreset(t.backendSettings.card, id);
      }
    } catch {
    }
    try {
      Va();
      t._overlayPlaceTimer && (clearTimeout(t._overlayPlaceTimer), t._overlayPlaceTimer = null);
      t._overlayRaf && (typeof cancelAnimationFrame == "function" && cancelAnimationFrame(t._overlayRaf), t._overlayRaf = 0);
      t.galleryUi?._softTimer && (clearTimeout(t.galleryUi._softTimer), t.galleryUi._softTimer = null);
      t._viewerPaintJob = null, t._viewerPaintScheduled = !1;
    } catch {
    }
    try {
      await blockHostChrome(!0);
    } catch {
    }
    try {
      t._hostReaper && clearInterval(t._hostReaper), t._hostReaper = null;
      // One-shot hide only — no recurring DOM work while settings are open.
      const hide = "position:fixed;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;visibility:hidden;";
      for (const ui of [t.galleryUi?.root, t.overlayUi?.root, t.debugUi?.root, t.overlayUi?.pinned, t.overlayUi?.preview, t.overlayUi?.fullscreen]) {
        if (ui && typeof ui.setStyleAttribute == "function") ui.setStyleAttribute(hide).catch(() => {
        });
      }
    } catch {
    }
    armSettingsCloseWatch();
    try {
      await xe();
    } catch {
      t.charEditUi = null;
    }
    try {
      document.body.innerHTML = "";
    } catch {
    }
    t.charEditUi = null;
    try {
      await ia();
    } catch {
    }
    typeof k.showContainer == "function" && await k.showContainer("fullscreen");
    try {
      window.focus?.();
      document.body?.focus?.();
    } catch {
    }
    await P(), t._debugTabTimer && clearInterval(t._debugTabTimer), t._debugTabTimer = null;
  }
  const _a = [
    '[class*="chat-container"]',
    '[class*="message-list"]',
    "main",
    ".scroller"
  ], $a = [
    "[class*='message-content']",
    "[class*='MessageContent']",
    "[class*='chat-message']",
    "[class*='ChatMessage']",
    "[class*='message']"
  ], Pt = 22, at = 528, ka = 720, Sa = 100, Ia = new sn();
  function Nt() {
    // Overlay + always-on image are one setting (overlay_markers).
    return t.backendSettings?.card?.overlay_markers !== !1;
  }
  function mobilePinOn() {
    return !!t.backendSettings?.card?.mobile_toggle_pin;
  }
  function Ut(e) {
    const n = w(e || "", 40).toLowerCase().replace(/_/g, "-");
    return n === "top-left" || n === "top-right" || n === "bottom-left" || n === "bottom-right" ? n : "bottom-right";
  }
  function Bt(e) {
    const n = w(e || "", 40).toLowerCase();
    return n === "mouse" || n === "cursor" ? "mouse" : "screen";
  }
  function Ea() {
    return Ut(t.backendSettings?.card?.hover_preview_corner);
  }
  function Ma() {
    return Bt(t.backendSettings?.card?.hover_preview_anchor);
  }
  function hoverPreviewOn() {
    return (t.backendSettings?.card || {}).hover_preview !== !1;
  }
  function viewerMinimizeMode() {
    return (t.backendSettings?.card?.viewer_minimize_mode) === "toolbar" ? "toolbar" : "icon";
  }
  function viewerViewport() {
    let vw = 0, vh = 0;
    try {
      if (typeof window < "u") {
        vw = Number(window.innerWidth) || 0, vh = Number(window.innerHeight) || 0;
        // Floating viewer / sticky pin paint on the host; plugin iframe is often tiny.
        // Prefer parent / host defaultView so % → px matches the real screen.
        if (vw < 240 || vh < 240) try {
          const p = window.parent;
          if (p && p !== window) {
            vw = Math.max(vw, Number(p.innerWidth) || 0);
            vh = Math.max(vh, Number(p.innerHeight) || 0);
          }
        } catch {
        }
        if ((vw < 240 || vh < 240) && t.hostDoc?.defaultView) try {
          const hv = t.hostDoc.defaultView;
          vw = Math.max(vw, Number(hv.innerWidth) || 0);
          vh = Math.max(vh, Number(hv.innerHeight) || 0);
        } catch {
        }
        if ((vw < 240 || vh < 240) && window.visualViewport) {
          vw = Math.max(vw, Number(window.visualViewport.width) || 0);
          vh = Math.max(vh, Number(window.visualViewport.height) || 0);
        }
        if ((vw < 240 || vh < 240) && window.screen) {
          vw = Math.max(vw, Number(window.screen.availWidth) || 0);
          vh = Math.max(vh, Number(window.screen.availHeight) || 0);
        }
      }
    } catch {
    }
    return {
      vw: Math.max(320, vw || 1200),
      vh: Math.max(400, vh || 800)
    };
  }
  /** Keep floating panels inside the viewport. Prefered w/h are preserved — only display size shrinks to fit. */
  function clampViewerGeo(geo = {}, minimized = !1) {
    const {
      vw,
      vh
    } = viewerViewport(), margin = 8, mode = viewerMinimizeMode();
    const storeW = Math.max(260, Number(geo.w) || se.w), storeH = Math.max(280, Number(geo.h) || se.h);
    let dispW, dispH;
    if (minimized) {
      if (mode === "toolbar") {
        dispW = Math.max(280, Math.min(storeW, vw - margin * 2));
        dispH = 40;
      } else dispW = 48, dispH = 48;
    } else {
      dispW = Math.max(260, Math.min(storeW, vw - margin * 2));
      dispH = Math.max(280, Math.min(storeH, vh - margin * 2));
    }
    let left = Number(geo.left), top = Number(geo.top);
    if (!Number.isFinite(left)) left = se.left;
    if (!Number.isFinite(top)) top = se.top;
    left = Math.max(margin, Math.min(left, Math.max(margin, vw - dispW - margin)));
    top = Math.max(margin, Math.min(top, Math.max(margin, vh - dispH - margin)));
    return {
      left: Math.round(left),
      top: Math.round(top),
      w: Math.round(storeW),
      h: Math.round(storeH),
      dispW: Math.round(dispW),
      dispH: Math.round(dispH)
    };
  }
  async function hideFloatingViewerForModal() {
    t._viewerHiddenForModal = !0;
    const g = t.galleryUi;
    if (!g?.panel) return;
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:0;visibility:hidden;");
      await g.panel.setStyleAttribute("position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;visibility:hidden;z-index:1;");
    } catch {
    }
  }
  async function restoreFloatingViewerAfterModal() {
    if (!t._viewerHiddenForModal) return;
    t._viewerHiddenForModal = !1;
    const g = t.galleryUi;
    if (!g) return;
    try {
      if (g.root && typeof g.root.setStyleAttribute == "function") await g.root.setStyleAttribute("position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;opacity:1;visibility:visible;");
      if (g.geo) g.geo = clampViewerGeo(g.geo, !!g.minimized);
      if (typeof g.applyChrome == "function") await g.applyChrome();
      else if (g.panel) await g.panel.setStyleAttribute(Ft(g.geo || se, !!g.minimized));
    } catch {
    }
  }
  function cornerFixedStyle(extra = []) {
    const f = Ea(), x = ["position:fixed", "display:block", ...extra];
    return f.includes("top") ? x.push("top:max(16px,env(safe-area-inset-top))") : x.push("bottom:max(16px,env(safe-area-inset-bottom))"), f.includes("left") ? x.push("left:max(16px,env(safe-area-inset-left))") : x.push("right:max(16px,env(safe-area-inset-right))"), x.join(";");
  }
  async function hitEl(A, _, O) {
    try {
      const G = await A.getBoundingClientRect();
      return _ >= G.left && _ <= G.right && O >= G.top && O <= G.bottom;
    } catch {
      return !1;
    }
  }
  function Ca(e = 220, n = null, o = null) {
    const i = Ea(), s = Ma(), c = typeof window < "u" && window.innerWidth || 1200, l = typeof window < "u" && window.innerHeight || 800, p = Math.max(180, Math.round(l * 0.55)), m = Math.min(p, Math.round(e * 1.35)), u = [
      "position:fixed",
      "display:block",
      "z-index:99996",
      `width:${e}px`,
      `max-height:${p}px`,
      "pointer-events:none",
      "border-radius:12px",
      "overflow:hidden",
      "border:1px solid rgba(255,255,255,.16)",
      "box-shadow:0 16px 40px rgba(0,0,0,.5)",
      "background:#0b0f18"
    ];
    if (s === "mouse" && Number.isFinite(Number(n)) && Number.isFinite(Number(o))) {
      const b = Number(n), C = Number(o);
      let S, E;
      return i === "top-left" ? (S = b - e - 14, E = C - m - 14) : i === "top-right" ? (S = b + 14, E = C - m - 14) : i === "bottom-left" ? (S = b - e - 14, E = C + 14) : (S = b + 14, E = C + 14), S = Math.max(16, Math.min(S, c - e - 16)), E = Math.max(16, Math.min(E, l - Math.min(m, p) - 16)), u.push(`left:${Math.round(S)}px`, `top:${Math.round(E)}px`, "right:auto", "bottom:auto"), u.join(";");
    }
    return i === "top-left" ? u.push("left:16px", "top:16px", "right:auto", "bottom:auto") : i === "top-right" ? u.push("right:16px", "top:16px", "left:auto", "bottom:auto") : i === "bottom-left" ? u.push("left:16px", "bottom:16px", "right:auto", "top:auto") : u.push("right:16px", "bottom:16px", "left:auto", "top:auto"), u.join(";");
  }
  function La() {
    const e = t.backendSettings?.card || {};
    let n = Ne(e.inline_thumb_pct, 0);
    if (!n) {
      const o = Ne(e.inline_thumb_w, at);
      n = Math.round(o / at * 100) || Sa;
    }
    const ov = t.overlayUi || {};
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const alwaysOn = Nt();
    const userCollapsed = !!ov._stickyThumbCollapsed;
    const editorOpen = !!ov._stickyEditorOpen || !!t.cardTagUi || !!t.charEditUi;
    const pct = typeof VC?.resolveStickyThumbPct == "function"
      ? VC.resolveStickyThumbPct({ settingsPct: n, alwaysOn, userCollapsed, editorOpen })
      : alwaysOn && !userCollapsed && !editorOpen ? Math.max(0, n) : 0;
    const envelope = typeof VC?.stickyThumbBoxFromPct == "function"
      ? VC.stickyThumbBoxFromPct(pct, at, ka)
      : { w: Math.max(0, Math.round(at * pct / 100)), h: Math.max(0, Math.round(ka * pct / 100)), pct };
    // Fit sticky frame to current NAI aspect (portrait/landscape/square) inside the envelope.
    const nai = t.backendSettings?.nai || {};
    const fitted = typeof VC?.fitBoxInside == "function"
      ? VC.fitBoxInside(envelope.w, envelope.h, nai.width, nai.height)
      : { w: envelope.w, h: envelope.h };
    return { w: fitted.w, h: fitted.h, pct: envelope.pct };
  }
  function pinPctDefaults() {
    return { x: pinXPctDefault, y: pinYPctDefault };
  }
  function getPinXPct() {
    const VC = globalThis.__INLAY_VIEWER_CORE__, card = t.backendSettings?.card || {}, vw = viewerViewport().vw;
    if (typeof VC?.resolveStoredPinPercent == "function") return VC.resolveStoredPinPercent(card, "x", vw, pinPctDefaults());
    const n = Number(card.overlay_x_pct);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : pinXPctDefault;
  }
  function getPinYPct() {
    const VC = globalThis.__INLAY_VIEWER_CORE__, card = t.backendSettings?.card || {}, vh = viewerViewport().vh;
    if (typeof VC?.resolveStoredPinPercent == "function") return VC.resolveStoredPinPercent(card, "y", vh, pinPctDefaults());
    const n = Number(card.overlay_y_pct);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : pinYPctDefault;
  }
  /** Sticky pin left = viewport-width % from left (host viewport, not plugin iframe). */
  function resolvePinLeftX() {
    const VC = globalThis.__INLAY_VIEWER_CORE__, pinW = Pt, vw = viewerViewport().vw, pct = getPinXPct();
    if (typeof VC?.pinPercentToPx == "function") return VC.pinPercentToPx(pct, vw, pinW, 4);
    return Math.max(4, Math.min(vw - pinW - 4, Math.round(vw * pct / 100)));
  }
  /** Sticky pin top = viewport-height % from bottom (CSS top; host viewport). */
  function resolvePinTopY(pinSize = Pt) {
    const VC = globalThis.__INLAY_VIEWER_CORE__, vh = viewerViewport().vh, pct = getPinYPct();
    if (typeof VC?.pinPercentToPxFromBottom == "function") return VC.pinPercentToPxFromBottom(pct, vh, pinSize, 8);
    const fromBottom = Math.floor(vh * pct / 100);
    return Math.max(8, Math.min(vh - pinSize - 8, vh - fromBottom - pinSize));
  }
  function jt() {
    return resolvePinLeftX();
  }
  function nt() {
    return !!(t.backendSettings?.card || {}).llm_anchor_percent;
  }
  /** ON: card y% when present. OFF: equal scroll bands (ignore saved y%). */
  function Ot(e, n, o) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const forceEven = !nt();
    if (typeof VC?.resolveCardAnchorPercent == "function") return VC.resolveCardAnchorPercent(e, n, o, { forceEven });
    if (forceEven) return gt(n, o);
    const a = e?.y_percent ?? e?.anchor_percent ?? e?.read_percent, r = Number(a);
    if (Number.isFinite(r)) return Math.max(0, Math.min(100, r));
    return gt(n, o);
  }
  async function Rt() {
    try {
      const e = await D("getRootDocument", () => k.getRootDocument?.(), null);
      if (!e) return;
      const n = await D("qLauncher", () => e.querySelector?.(`.${M}`), null);
      n && await D("rmLauncher", () => n.remove?.(), null);
    } catch {
    }
    t.launcherMounted = !1;
  }
  function Ie(e) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const u = N?.resolveImageUrl?.(e) || e?.image_url;
      // DOMPurify keeps data:image, strips blob:. Never use blob: or localhost backend.
      if (typeof u == "string" && /^data:image\//i.test(u)) return u;
    } catch {
    }
    return "";
  }
  /** Warm a card to a DOMPurify-safe data:image URL (Risu strips blob:/http). */
  async function ensureStickyCardImage(card) {
    if (!card?.id) return "";
    try {
      const N = globalThis.__INLAY_NATIVE__;
      let src = typeof N?.resolveImageUrl == "function" ? N.resolveImageUrl(card) || "" : "";
      if ((!src || !/^data:image\//i.test(src)) && typeof N?.ensureImageUrl == "function") {
        src = await N.ensureImageUrl(card.id) || "";
        if (src) card.image_url = src;
      }
      if (typeof src == "string" && /^data:image\//i.test(src)) return src;
    } catch {
    }
    try {
      const fallback = Ie(card);
      if (typeof fallback == "string" && /^data:image\//i.test(fallback)) return fallback;
    } catch {
    }
    return "";
  }
  async function ue(force = !1) {
    if (!force && t.hostDoc) return t.hostDoc;
    const tries = [
      () => k.getRootDocument?.(),
      () => globalThis.risuai?.getRootDocument?.()
    ];
    for (const fn of tries) {
      try {
        const e = await D("getRootDocument", fn, null);
        if (e && typeof e.createElement == "function") return t.hostDoc = e, e;
      } catch {
      }
    }
    return t.hostDoc = null, null;
  }
  function armSettingsCloseWatch() {
    t._settingsWatch && clearInterval(t._settingsWatch);
    let miss = 0;
    t._settingsWatch = setInterval(() => {
      if (!t.uiOpen) {
        clearInterval(t._settingsWatch), t._settingsWatch = null;
        return;
      }
      if (t._uiRendering) {
        miss = 0;
        return;
      }
      try {
        const shell = typeof document < "u" ? document.getElementById("nx-shell") : null;
        if (shell && shell.isConnected) {
          miss = 0;
          return;
        }
        miss += 1;
        if (miss < 4) return;
        t.uiOpen = !1, t._hostReaper && (clearInterval(t._hostReaper), t._hostReaper = null), clearInterval(t._settingsWatch), t._settingsWatch = null;
        flushSettingsSave().catch(() => {
        }), blockHostChrome(!1).catch(() => {
        }), y("info", "settings.closed", "host ui restore");
      } catch {
      }
    }, 500);
  }
  function startHostUiWatchdog() {
    if (t._hostWatch) return;
    let ticks = 0;
    t._hostWatch = setInterval(() => {
      if (t.unloading || t.uiOpen || t._hostChromeBlocked) return;
      ticks += 1;
      const card = t.backendSettings?.card || {}, needViewer = card.floating_viewer !== !1, needOverlay = card.overlay_markers !== !1;
      if (needViewer && !t.galleryUi?.root || needOverlay && !t.overlayUi?.root) {
        t.hostDoc = null, it().catch(() => {
        });
      }
      if (ticks >= 90 && t._hostWatch) {
        clearInterval(t._hostWatch);
        t._hostWatch = setInterval(() => {
          if (t.unloading || t.uiOpen || t._hostChromeBlocked) return;
          const c = t.backendSettings?.card || {};
          if (c.floating_viewer !== !1 && !t.galleryUi?.root) {
            t.hostDoc = null, it().catch(() => {
            });
          }
        }, 5e3);
      }
    }, 1e3);
  }
  async function Ee(e) {
    if (!e || typeof e.querySelector != "function") return null;
    const n = await D("hostBody", () => e.querySelector("body"), null);
    return !n || typeof n.appendChild != "function" ? null : n;
  }
  async function H(e, n, o = {}) {
    const a = await e.createElement(n);
    return o.className && typeof a.setClassName == "function" && await a.setClassName(o.className), o.style && typeof a.setStyleAttribute == "function" && await a.setStyleAttribute(o.style), o.html != null && typeof a.setInnerHTML == "function" ? await a.setInnerHTML(o.html) : o.text != null && typeof a.setTextContent == "function" && await a.setTextContent(o.text), a;
  }
  async function rt(e) {
    const n = await ue();
    if (n)
      try {
        const o = await D("qAll", () => n.querySelectorAll?.(`.${e}`), null), a = o && typeof k.unwarpSafeArray == "function" ? await D("unwrap", () => k.unwarpSafeArray(o), []) : o ? [o] : [];
        for (const r of a || []) await D("rm", () => r?.remove?.(), null);
      } catch {
        const a = await D("qOne", () => n.querySelector?.(`.${e}`), null);
        a && await D("rmOne", () => a.remove?.(), null);
      }
  }
  function Re(e) {
    return String(e || "").replace(/[^a-zA-Z0-9\uac00-\ud7a3\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/g, "").toLowerCase();
  }
  function Ta(e) {
    const n = w(e, 2e5);
    if (!n) return [];
    const o = n.split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean);
    return o.length >= 2 ? o : n.split(`
`).map((a) => a.trim()).filter((a) => a.length >= 8);
  }
  function ge(e, text = "") {
    const n = t.gallery || [];
    if (!e) return [];
    return n.filter((o) => o.content_hash && o.content_hash === e);
  }
  function ot(e, n) {
    if (!e || !n) return 0;
    if (n.content_hash && ye(e) === n.content_hash) return 100;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.prefixMatchRatio == "function") {
      return Math.round(VC.prefixMatchRatio(e, n.assistant_preview || n.text || "") * 100);
    }
    return 0;
  }
  /**
   * Streaming hash upgrade: same character/chat/msg#/role, Dice≥60% → rewrite card hash once.
   * Hot path stays exact-hash only after this.
   */
  async function maybeRebindAndLink(message, scope = null) {
    if (!message?.hash) return linkedCards(message);
    let linked = linkedCards(message);
    if (linked.length) return linked;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.findHashRebindCandidates != "function" || !message.text) return [];
    const sc = scope || t.lastScope || {};
    const candidates = VC.findHashRebindCandidates(t.gallery || [], {
      newHash: message.hash,
      text: message.text,
      characterId: message.characterId || sc.characterId || "",
      chatId: message.chatId || sc.chatId || "",
      sessionId: message.sessionId || sc.sessionId || "",
      messageIndex: Number(message.chatIndex ?? message.messageIndex ?? -1),
      role: message.role || ""
    });
    if (!candidates.length) return [];
    try {
      const sid = message.sessionId || sc.sessionId || "";
      await K("/v1/gallery/rebind-hash", {
        method: "POST",
        body: {
          session_id: sid,
          card_ids: candidates.map((c) => c.id).filter(Boolean),
          to_hash: message.hash,
          assistant_preview: message.text || ""
        }
      }, 15e3);
      if (sid) await ce(sid, !0);
      y("info", "gallery.rebind", `n=${candidates.length} hash=${String(message.hash).slice(0, 8)} msg#${message.chatIndex ?? "?"}`);
    } catch (err) {
      return y("warn", "gallery.rebind.fail", err?.message || err), [];
    }
    return linkedCards(message);
  }
  function Me(e) {
    const n = /* @__PURE__ */ new Map();
    const yOf = (c) => {
      const v = Number(c?.y_percent ?? c?.anchor_percent ?? c?.read_percent);
      return Number.isFinite(v) ? v : 999;
    };
    for (const o of e || []) {
      const a = `${o.paragraph ?? "?"}|${o.shot_index ?? o.id}`, r = n.get(a);
      (!r || Number(o.created_at || 0) >= Number(r.created_at || 0)) && n.set(a, o);
    }
    // All current-message shots (y% asc) — do not cap at 8.
    return [...n.values()].sort((o, a) => yOf(o) - yOf(a) || Number(o.paragraph ?? 0) - Number(a.paragraph ?? 0) || Number(o.shot_index ?? 0) - Number(a.shot_index ?? 0) || Number(o.created_at || 0) - Number(a.created_at || 0));
  }
  async function it() {
    if (t.uiOpen) {
      try {
        await blockHostChrome(!0);
      } catch {
      }
      return;
    }
    try {
      await le();
    } catch {
    }
    const e = t.backendSettings?.card || {}, n = await Z().catch(() => null);
    if (n?.sessionId) try {
      await ce(n.sessionId);
    } catch {
    }
    e.floating_viewer !== !1 ? await lt() : await st(), e.overlay_markers !== !1 ? await Ya() : await Wt(), e.debug_panel ? await Ba() : await ct();
    // Re-apply pin % with host viewport (plugin iframe size is tiny on boot).
    if (e.overlay_markers !== !1) {
      const reapplyPin = async () => {
        try {
          invalidateOverlayLayoutCache(), await he(), Ce();
        } catch {
        }
      };
      await reapplyPin();
      // Host defaultView may appear a beat after overlay mount — one deferred pass.
      t._pinBootTimer && clearTimeout(t._pinBootTimer);
      t._pinBootTimer = setTimeout(() => {
        t._pinBootTimer = null;
        if (t.uiOpen || t.unloading) return;
        reapplyPin().catch(() => {
        });
      }, 220);
    }
  }
  async function Aa() {
    try {
      const e = await Kt(ne);
      if (e && typeof e == "object") return clampViewerGeo({
        left: re(e.left, -2e3, 6e3, se.left),
        top: re(e.top, -2e3, 6e3, se.top),
        w: re(e.w, 260, 2400, se.w),
        h: re(e.h, 280, 2400, se.h)
      }, !1);
    } catch {
    }
    return clampViewerGeo({
      ...se
    }, !1);
  }
  async function qt(e) {
    try {
      const g = clampViewerGeo(e || se, !1);
      await Jt(ne, {
        left: Math.round(g.left),
        top: Math.round(g.top),
        w: Math.round(g.w),
        h: Math.round(g.h)
      });
    } catch {
    }
  }
  async function loadViewerIconGeo() {
    try {
      const e = await Kt(iconStoreKey);
      if (e && typeof e == "object") {
        const left = re(e.left, -2e3, 6e3, iconSe.left), top = re(e.top, -2e3, 6e3, iconSe.top);
        return {
          left: Math.round(left),
          top: Math.round(top)
        };
      }
    } catch {
    }
    return {
      ...iconSe
    };
  }
  async function saveViewerIconGeo(e) {
    try {
      const left = Math.round(Number(e?.left) || iconSe.left), top = Math.round(Number(e?.top) || iconSe.top);
      await Jt(iconStoreKey, {
        left,
        top
      });
      return {
        left,
        top
      };
    } catch {
      return {
        left: Math.round(Number(e?.left) || iconSe.left),
        top: Math.round(Number(e?.top) || iconSe.top)
      };
    }
  }
  async function savePinPercent(xPctIn, yPctIn) {
    const VC = globalThis.__INLAY_VIEWER_CORE__, { vw, vh } = viewerViewport();
    const xPct = typeof VC?.clampPinPercent == "function" ? VC.clampPinPercent(xPctIn, pinXPctDefault) : Math.max(0, Math.min(100, Math.floor(Number(xPctIn) || pinXPctDefault)));
    const yPct = typeof VC?.clampPinPercent == "function" ? VC.clampPinPercent(yPctIn, pinYPctDefault) : Math.max(0, Math.min(100, Math.floor(Number(yPctIn) || pinYPctDefault)));
    const nx = typeof VC?.pinPercentToPx == "function" ? VC.pinPercentToPx(xPct, vw, Pt, 4) : Math.max(4, Math.min(vw - Pt - 4, Math.floor(vw * xPct / 100)));
    const ny = typeof VC?.pinPercentToPxFromBottom == "function" ? VC.pinPercentToPxFromBottom(yPct, vh, Pt, 8) : Math.max(8, Math.min(vh - Pt - 8, vh - Math.floor(vh * yPct / 100) - Pt));
    t.backendSettings = t.backendSettings || {}, t.backendSettings.card = {
      ...(t.backendSettings.card || {}),
      overlay_pin_unit: "pct",
      overlay_pin_origin: "bl",
      overlay_x_pct: xPct,
      overlay_y_pct: yPct,
      overlay_x_offset: nx,
      overlay_y_offset: ny
    };
    invalidateOverlayLayoutCache();
    try {
      const ix = typeof document < "u" ? document.getElementById("nx-overlay-x") : null, iy = typeof document < "u" ? document.getElementById("nx-overlay-y") : null;
      ix && (ix.value = String(xPct)), iy && (iy.value = String(yPct));
    } catch {
    }
    try {
      await pe({
        card: {
          overlay_pin_unit: "pct",
          overlay_pin_origin: "bl",
          overlay_x_pct: xPct,
          overlay_y_pct: yPct,
          overlay_x_offset: nx,
          overlay_y_offset: ny
        }
      });
    } catch {
    }
    return { x: nx, y: ny, xPct, yPct };
  }
  async function resetAllWindowPositions() {
    await qt({
      ...se
    });
    await saveViewerIconGeo({
      ...iconSe
    });
    const pin = await savePinPercent(pinXPctDefault, pinYPctDefault);
    if (t.galleryUi?.geo) {
      t.galleryUi.expandedGeo = {
        ...se
      };
      t.galleryUi.iconGeo = {
        ...iconSe
      };
      t.galleryUi.geo = t.galleryUi.minimized ? clampViewerGeo({
        ...se,
        left: iconSe.left,
        top: iconSe.top
      }, !0) : {
        ...se
      };
      t.galleryUi.expandedH = se.h;
      try {
        typeof t.galleryUi.applyChrome == "function" ? await t.galleryUi.applyChrome() : t.galleryUi.panel && await t.galleryUi.panel.setStyleAttribute?.(Ft(t.galleryUi.geo, !!t.galleryUi.minimized));
      } catch {
      }
    }
    try {
      await he();
    } catch {
    }
    Ce(), y("info", "windows.reset", `viewer=${se.left},${se.top} icon=${iconSe.left},${iconSe.top} pin=${pin.x},${pin.y}`);
    return pin;
  }
  async function Pa() {
    try {
      const e = await Kt(ie);
      if (typeof e == "boolean") return e;
      if (e && typeof e == "object" && typeof e.open == "boolean") return e.open;
    } catch {
    }
    return !1;
  }
  async function Na(e) {
    try {
      await Jt(ie, { open: !!e });
    } catch {
    }
  }
  async function loadViewerMinimized() {
    try {
      const e = await Kt(minStoreKey);
      if (typeof e == "boolean") return e;
      if (e && typeof e == "object" && typeof e.open == "boolean") return !e.open;
      if (e && typeof e == "object" && typeof e.minimized == "boolean") return e.minimized;
    } catch {
    }
    return !1;
  }
  async function saveViewerMinimized(e) {
    t.viewerMinimized = !!e;
    try {
      await Jt(minStoreKey, { minimized: !!e });
    } catch {
    }
  }
  const LOAD_SPIN = ["/", "-", "\\", "|"];
  function loadSpinChar() {
    return LOAD_SPIN[Math.floor(Date.now() / 180) % LOAD_SPIN.length];
  }
  function formatViewerJob(B) {
    if (!B) return null;
    const state = String(B.state || ""), pct = Math.max(0, Math.min(100, Math.round(Number(B.progress) || 0))), shotCount = Number(B.shot_count || 0), shotDone = Number(B.shot_done ?? B.shot_index ?? 0), shot = shotCount > 0 ? `${Math.min(Math.max(0, shotDone), shotCount)}/${shotCount}` : "", isReroll = B.kind === "reroll" || B.jobId === "reroll";
    let stage = "작업 중";
    return state === "queued" ? stage = "대기열" : state === "tagging" ? stage = "장면 태깅" : state === "generating" || state === "running" ? stage = isReroll ? "이미지 리롤" : "이미지 생성" : state === "cancelled" ? stage = "이전 작업 정리" : state === "done" ? stage = isReroll ? "리롤 완료" : "생성 완료" : state === "error" ? stage = isReroll ? "리롤 실패" : "생성 실패" : isReroll && (stage = "이미지 리롤"), {
      stage,
      pct,
      shot,
      detail: String(B.message || "").trim(),
      state,
      busy: state !== "done" && state !== "error" && state !== "cancelled"
    };
  }
  function readIndexProgress(B) {
    const N = globalThis.__INLAY_NATIVE__, VC = globalThis.__INLAY_VIEWER_CORE__;
    let warmPct = 0, warmBusy = !1;
    try {
      const w = typeof N?.warmProgress == "function" ? N.warmProgress() : null;
      if (w) warmPct = Number(w.pct) || 0, warmBusy = !!w.busy;
    } catch {
    }
    if (typeof VC?.resolveIndexProgress == "function") {
      return VC.resolveIndexProgress({
        warmPct,
        warmBusy,
        jobState: B?.state,
        jobPct: B?.progress
      });
    }
    if (warmBusy) return { pct: Math.max(6, warmPct), busy: !0, label: "인덱싱" };
    if (String(B?.state || "") === "tagging") return { pct: Math.max(6, Math.round(Number(B.progress) || 0)), busy: !0, label: "인덱싱" };
    return { pct: 0, busy: !1, label: "인덱싱" };
  }
  function viewerStatusHtml(B, extra = "") {
    const info = formatViewerJob(B);
    const idx = readIndexProgress(B);
    if (!info && !idx.busy) return `<span style="color:#a6b1c2;font-size:11px;line-height:1.2">${h(extra || "메시지를 클릭해서 선택하세요")}</span>`;
    const state = info?.state || (idx.busy ? "running" : "");
    const busy = !!(info?.busy || idx.busy);
    const label = busy ? `로딩${loadSpinChar()}` : state === "done" ? "완료" : state === "error" ? "실패" : "대기";
    const stage = info?.stage || idx.label;
    const pct = info ? info.pct : idx.pct;
    const shot = info?.shot || "";
    const meta = idx.busy && info?.busy
      ? `${stage}${shot ? ` ${shot}` : ""} ${pct}% · ${idx.label} ${idx.pct}%`
      : idx.busy && !info
        ? `${idx.label} ${idx.pct}%`
        : `${stage}${shot ? ` ${shot}` : ""} ${pct}%`;
    const accent = state === "error" ? "#f87171" : state === "done" ? "#86efac" : "#c4b5fd";
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const bars = typeof VC?.composeDualProgressBarsHtml == "function"
      ? VC.composeDualProgressBarsHtml({
        jobPct: info ? info.pct : 0,
        indexPct: idx.pct,
        jobBusy: !!(info && info.busy),
        indexBusy: !!idx.busy,
        error: state === "error"
      })
      : `<span style="flex:0 0 132px;display:flex;flex-direction:column;gap:3px"><span style="height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(info?.busy ? 6 : 0, info?.pct || 0)}%;background:#7c6cff"></span></span><span style="height:5px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden"><span style="display:block;height:100%;width:${Math.max(idx.busy ? 6 : 0, idx.pct || 0)}%;background:#2dd4bf"></span></span></span>`;
    return `<div style="display:flex;align-items:center;gap:8px;min-width:0;min-height:28px"><span style="flex:0 0 auto;font-weight:700;color:${accent};font-size:10px;font-variant-numeric:tabular-nums">${label}</span><span style="min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8b97ab;font-size:10px">${h(meta)}${extra ? ` · ${h(extra)}` : ""}</span>${bars}</div>`;
  }
  function Dt(e) {
    const n = w(e || "", 200);
    if (!n) return null;
    const o = n.toLowerCase(), a = (r, i) => {
      for (const s of r || []) if ([s.name, ...Array.isArray(s.aliases) ? s.aliases : []].map((c) => w(c, 200)).filter(Boolean).some((c) => c.toLowerCase() === o)) return {
        ...s,
        scope: i
      };
      return null;
    };
    return a(enabledGlobalsForCharacter(), "__global__") || a(t.charactersSession, t.lastScope?.sessionId || "session");
  }
  function Ft(e, minimized = !1) {
    const c = clampViewerGeo(e || se, minimized), mode = viewerMinimizeMode();
    // Persist preferred size (c.w/h) + on-screen position; never overwrite preferred size with shrunk dispW/dispH.
    if (e && typeof e == "object") e.left = c.left, e.top = c.top, e.w = c.w, e.h = c.h;
    const n = c.dispH, o = c.dispW;
    return [
      "position:fixed",
      `left:${c.left}px`,
      `top:${c.top}px`,
      `width:${o}px`,
      `height:${n}px`,
      "z-index:99989",
      "display:flex",
      "flex-direction:column",
      "overflow:hidden",
      "pointer-events:auto",
      "opacity:1",
      "visibility:visible",
      "background:linear-gradient(165deg,rgba(20,24,36,.97),rgba(10,13,22,.98))",
      "border:1px solid rgba(151,139,255,.28)",
      "border-radius:16px",
      "box-shadow:0 20px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.03) inset",
      "backdrop-filter:blur(14px)",
      "color:#e2e8f0",
      "font:13px/1.45 sans-serif",
      "touch-action:none",
      minimized ? "resize:none" : "resize:both",
      minimized && mode === "icon" ? "min-width:48px" : minimized ? "min-width:280px" : "min-width:260px",
      minimized ? `min-height:${n}px` : "min-height:280px"
    ].join(";");
  }
  function imageStageStyle(geo = {}) {
    const panelH = Math.max(280, Number(geo.h) || 560);
    // header + gaps + status + thumbs + chip row + padding. Prompt block removed — image can grow with panel.
    const reserved = 36 + 14 + 22 + 96 + 40 + 16;
    const h = Math.max(220, panelH - reserved);
    return [
      "width:100%",
      `height:${h}px`,
      `min-height:${h}px`,
      "flex:1 1 auto",
      "background:#0b0f18",
      "border-radius:12px",
      "overflow:hidden",
      "display:flex",
      "align-items:center",
      "justify-content:center"
    ].join(";");
  }
  async function xe() {
    const e = t.charEditUi, n = e?.root || (typeof document < "u" ? document.getElementById("nx-char-edit-modal") : null);
    try {
      n?.remove?.();
    } catch {
    }
    const o = !!e?.openedContainer;
    if (t.charEditUi = null, t.autotagFocus?.scope === "modal" && (t.autotagFocus = null), o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
    // Viewer stays visible during overlays — no restoreFloatingViewerAfterModal.
    if (t.galleryUi?.renderCast) try {
      await t.galleryUi.renderCast();
    } catch {
    }
    if (t.overlayUi && !t.cardTagUi) {
      t.overlayUi._stickyEditorOpen = !1;
      try { await Ht(); } catch {}
    }
  }
  async function Ua(e) {
    if (!e?.name) return;
    if (typeof document > "u" || !document.body) {
      y("error", "char.edit.open", "plugin document unavailable");
      return;
    }
    await closeCardTagEdit(), await xe(), await closeCharacterCreateModal().catch(() => null);
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    try { await Ht(); } catch {}
    const rosterResolved = await ensureViewerRosterLoaded().catch(() => null);
    const n = e.roster || Dt(e.name) || {
      name: e.name,
      aliases: [e.name],
      original: "",
      appearance: "",
      attire: "",
      accessories: "",
      scope: rosterResolved?.rosterSessionId || t.lastScope?.sessionId || "",
      id: ""
    }, o = Array.isArray(n.aliases) ? n.aliases.join(", ") : String(n.aliases || ""), a = n.scope === "__global__" ? "글로벌" : rosterResolved?.rosterUnified ? "통합" : "채팅", r = !t.uiOpen;
    // Keep floating viewer visible: transparent plugin shell, do not hide host chrome.
    r && typeof k.showContainer == "function" && (await k.showContainer("fullscreen"), document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;");
    const i = document.createElement("div");
    i.id = "nx-char-edit-modal", i.setAttribute("data-ce-root", "1"), i.innerHTML = [
      '<div data-ce-backdrop style="position:fixed;inset:0;z-index:100000;background:rgba(4,8,16,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;">',
      '<div data-ce-card style="width:min(720px,100%);max-height:min(94vh,920px);background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(151,139,255,.4);border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;">',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0">',
      `<div><div style="font-weight:700;font-size:15px">캐릭터 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">char${e.index + 1} · ${h(n.name || e.name)} · ${a}</div></div>`,
      '<button type="button" data-ce-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button>',
      "</div>",
      '<form data-ce-form style="padding:14px 16px;display:grid;gap:10px;overflow:auto;flex:1;min-height:0">',
      `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>캐릭터 프리셋 (현재 챗/글로벌)</span><select data-ce-preset style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:9px 11px;font:13px/1.4 Segoe UI,sans-serif"><option value="">직접 입력 / 현재 값 유지</option>${(() => {
        const Vt = [], Xt = /* @__PURE__ */ new Set(), Yt = (Gt, Kt) => {
          for (const Qt of Gt || []) {
            const me = w(Qt?.name || "", 200);
            if (!me) continue;
            const nn = me.toLowerCase();
            if (Xt.has(nn)) continue;
            Xt.add(nn), Vt.push(`<option value="${h(Kt + "::" + me)}" ${me.toLowerCase() === w(n.name || e.name, 200).toLowerCase() && (Kt === "G" ? n.scope === "__global__" : n.scope !== "__global__") ? "selected" : ""}>[${Kt}] ${h(me)}</option>`);
          }
        };
        return Yt(enabledGlobalsForCharacter(), "G"), Yt(t.charactersSession, "S"), Vt.join("");
      })()}</select></label>`,
      `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) minmax(0,.7fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-ce-name value="${h(n.name || e.name)}" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-ce-original value="${h(n.original || "")}" placeholder="(원작 캐릭터 태그)" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>성별</span><select data-ce-gender style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"><option value="" ${!["girl","boy","other","female","male"].includes(String(n.gender||n.sex||""))?"selected":""}>미정</option><option value="girl" ${["girl","female"].includes(String(n.gender||n.sex||""))?"selected":""}>girl</option><option value="boy" ${["boy","male"].includes(String(n.gender||n.sex||""))?"selected":""}>boy</option><option value="other" ${String(n.gender||n.sex||"")==="other"?"selected":""}>other</option></select></label></div>`,
      `<div style="display:grid;grid-template-columns:32px minmax(0,1fr) minmax(0,1.2fr);gap:6px 8px;align-items:center;padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03)"><span></span><span style="font-size:10px;font-weight:700;color:#778398;letter-spacing:.04em">기본</span><span style="font-size:10px;font-weight:700;color:#778398;letter-spacing:.04em">한·영 표기</span><span style="font-size:11px;font-weight:700;color:#9aa6b8">성</span><input data-ce-surname value="${h(n.surname || "")}" placeholder="한" style="width:100%;box-sizing:border-box;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 9px;font:13px Segoe UI,sans-serif"><input data-ce-surname-variants value="${h(Array.isArray(n.surname_variants) ? n.surname_variants.join(", ") : n.surname_variants || "")}" placeholder="Han, HAN" style="width:100%;box-sizing:border-box;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 9px;font:13px Segoe UI,sans-serif"><span style="font-size:11px;font-weight:700;color:#9aa6b8">이름</span><input data-ce-given value="${h(n.given_name || "")}" placeholder="진우" style="width:100%;box-sizing:border-box;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 9px;font:13px Segoe UI,sans-serif"><input data-ce-given-variants value="${h(Array.isArray(n.given_name_variants) ? n.given_name_variants.join(", ") : n.given_name_variants || "")}" placeholder="Jinwoo, JINWOO" style="width:100%;box-sizing:border-box;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:7px 9px;font:13px Segoe UI,sans-serif"></div>`,
      `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>트리거/별칭</span><input data-ce-aliases value="${h(o)}" placeholder="한진우, HAN JINWOO, 진우" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif"></label>`,
      `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>외형 태그 (girl/boy · 옷·무기 제외)</span><textarea data-ce-appearance rows="5" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:9px 11px;font:13px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:110px">${h(n.appearance || "")}</textarea></label>`,
      `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px"><div style="display:grid;gap:4px;min-width:0"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;color:#9aa6b8;font-size:11px;font-weight:600"><span>옷·악세사리</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-attire-locked type="checkbox" ${n.attire_locked !== false ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label></div><textarea data-ce-attire rows="3" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:9px 11px;font:13px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:72px">${h(n.attire || "")}</textarea></div><div style="display:grid;gap:4px;min-width:0"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;color:#9aa6b8;font-size:11px;font-weight:600"><span>무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;margin:0;color:#d7deea;font-size:11px;font-weight:550;cursor:pointer;white-space:nowrap"><input data-ce-accessories-locked type="checkbox" ${n.accessories_locked !== false ? "checked" : ""} style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label></div><textarea data-ce-accessories rows="3" style="width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:9px 11px;font:13px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:72px">${h(n.accessories || "")}</textarea></div></div>`,
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,196,72,.35);background:rgba(255,196,72,.08)">',
      '<button type="button" data-ce-autotag style="cursor:pointer;border:1px solid rgba(255,196,72,.7);background:rgba(255,196,72,.2);color:#ffe7a8;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">오토태그</button>',
      '<button type="button" data-ce-regenerate style="cursor:pointer;border:1px solid rgba(124,108,255,.7);background:rgba(124,108,255,.2);color:#ddd6fe;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">관련 이미지 재생성</button>',
      '<span data-ce-autotag-badge style="display:none;font-size:11px;font-weight:750;color:#ffe7a8;background:rgba(255,196,72,.18);border:1px solid rgba(255,196,72,.45);border-radius:999px;padding:3px 9px"></span>',
      '<span data-ce-autotag-status style="color:#c9b56a;font-size:11px;flex:1;min-width:160px">클릭=붙여넣기 대상 · 더블클릭=파일</span>',
      "</div>",
      "</form>",
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;background:rgba(8,12,20,.92)">',
      '<span data-ce-status style="color:#9aa6b8;font-size:11px">수정 후 저장하세요</span>',
      '<div style="display:flex;gap:8px">',
      '<button type="button" data-ce-cancel style="cursor:pointer;border:0;background:#334155;color:#fff;padding:8px 12px;border-radius:9px;font:12px Segoe UI,sans-serif">취소</button>',
      '<button type="button" data-ce-save style="cursor:pointer;border:0;background:#7c6cff;color:#fff;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">저장</button>',
      "</div></div></div></div>"
    ].join(""), document.body.appendChild(i);
    const s = i.querySelector("[data-ce-name]"), c = i.querySelector("[data-ce-original]"), genderEl = i.querySelector("[data-ce-gender]"), surnameEl = i.querySelector("[data-ce-surname]"), givenEl = i.querySelector("[data-ce-given]"), surnameVariantsEl = i.querySelector("[data-ce-surname-variants]"), givenVariantsEl = i.querySelector("[data-ce-given-variants]"), l = i.querySelector("[data-ce-aliases]"), p = i.querySelector("[data-ce-appearance]"), m = i.querySelector("[data-ce-attire]"), accEl = i.querySelector("[data-ce-accessories]"), attireLockedEl = i.querySelector("[data-ce-attire-locked]"), accLockedEl = i.querySelector("[data-ce-accessories-locked]"), presetEl = i.querySelector("[data-ce-preset]"), u = i.querySelector("[data-ce-status]"), b = i.querySelector("[data-ce-autotag]"), C = i.querySelector("[data-ce-autotag-badge]"), S = i.querySelector("[data-ce-autotag-status]"), E = (f) => {
      u && (u.textContent = f);
    }, applyPreset = (f) => {
      const x = String(f || ""), I = x.startsWith("G::") ? enabledGlobalsForCharacter().find((R) => w(R?.name || "", 200) === x.slice(3)) : x.startsWith("S::") ? (t.charactersSession || []).find((R) => w(R?.name || "", 200) === x.slice(3)) : null;
      if (!I) return;
      const R = Array.isArray(I.aliases) ? I.aliases.join(", ") : String(I.aliases || "");
      s && (s.value = w(I.name || "", 200)), c && (c.value = w(I.original || "", 400)), surnameEl && (surnameEl.value = w(I.surname || "", 200)), givenEl && (givenEl.value = w(I.given_name || "", 200)), surnameVariantsEl && (surnameVariantsEl.value = Array.isArray(I.surname_variants) ? I.surname_variants.join(", ") : String(I.surname_variants || "")), givenVariantsEl && (givenVariantsEl.value = Array.isArray(I.given_name_variants) ? I.given_name_variants.join(", ") : String(I.given_name_variants || "")), l && (l.value = R), p && (p.value = w(I.appearance || "", 4e3)), m && (m.value = w(I.attire || "", 4e3)), accEl && (accEl.value = w(I.accessories || "", 4e3)), attireLockedEl && (attireLockedEl.checked = I.attire_locked !== false), accLockedEl && (accLockedEl.checked = I.accessories_locked !== false), n.id = I.id || n.id, n.scope = I.scope || (x.startsWith("G::") ? "__global__" : n.scope), E(`[${x.startsWith("G::") ? "G" : "S"}] ${I.name} 불러옴 · 저장하세요`);
    }, j = (f, x = "선택됨 · Ctrl+V") => {
      t.autotagFocus = f ? {
        scope: "modal",
        id: "char-edit"
      } : null, b && (b.textContent = f ? "붙여넣기 대기" : "오토태그", b.style.background = f ? "rgba(255,196,72,.35)" : "rgba(255,196,72,.2)"), C && (C.style.display = f ? "inline-flex" : "none", C.textContent = f ? x : ""), S && (S.textContent = f ? "이 팝업 선택됨 · Ctrl+V로 이미지 붙여넣기 · 더블클릭으로 파일" : "클릭=붙여넣기 대상 · 더블클릭=파일", S.style.color = f ? "#ffe7a8" : "#c9b56a");
    }, d = async (f) => {
      if (f) {
        j(!0, "분석 중…"), b && (b.textContent = "분석 중…");
        try {
          const x = await Lt(f, S);
          p && (p.value = x.appearance || "");
          m && (m.value = x.attire || "");
          accEl && (accEl.value = x.accessories || "");
          genderEl && x.gender && (genderEl.value = x.gender);
          j(!0, "완료"), b && (b.textContent = "오토태그"), E("오토태그 반영됨 · 외형/의상/악세/성별 · 저장을 누르세요");
        } catch (x) {
          S && (S.textContent = `실패: ${z(x?.message || x, 80)}`, S.style.color = "#f87171"), j(!0, "실패"), b && (b.textContent = "붙여넣기 대기");
        }
      }
    };
    presetEl?.addEventListener("change", () => {
      applyPreset(presetEl.value);
    }), b?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation();
      const x = t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-edit";
      j(!x);
    }), b?.addEventListener("dblclick", (f) => {
      f.preventDefault(), f.stopPropagation(), j(!0);
      const x = document.createElement("input");
      x.type = "file", x.accept = "image/*", x.style.display = "none", document.body.appendChild(x), x.addEventListener("change", async () => {
        const I = x.files?.[0];
        x.remove(), I && await d(I);
      }), x.click();
    }), i.addEventListener("paste", async (f) => {
      if (!(t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-edit")) return;
      const x = Array.from(f.clipboardData?.items || []).find((R) => R.type.startsWith("image/"));
      if (!x) return;
      f.preventDefault(), f.stopPropagation();
      const I = x.getAsFile();
      I && await d(I);
    });
    const U = async () => {
      const live = await Z({ useOverride: !1 }).catch(() => null);
      const rosterMeta = t._viewerRoster || await resolveViewerRosterSession().catch(() => null);
      const rosterSessionId = rosterMeta?.rosterSessionId || live?.sessionId || "";
      const x = n?.scope === "__global__" ? "__global__" : rosterSessionId;
      if (!x) {
        E("저장 실패: 세션 없음");
        return;
      }
      const I = w(s?.value || n.name || e.name, 200);
      if (!I) {
        E("이름이 비어 있습니다");
        return;
      }
      const R = w(c?.value || "", 400), splitNames = (v) => String(v || "").split(/[,/\n]/).map((Q) => Q.trim()).filter(Boolean), g = splitNames(l?.value), F = w(p?.value || "", 4e3), T = w(m?.value || "", 4e3), Acc = w(accEl?.value || "", 4e3);
      try {
        E(`저장 중… (${I})`);
        const edited = {
          id: n.id || "",
          name: I,
          original: R,
          aliases: g.length ? g : [I],
          surname: w(surnameEl?.value || "", 200),
          given_name: w(givenEl?.value || "", 200),
          surname_variants: splitNames(surnameVariantsEl?.value),
          given_name_variants: splitNames(givenVariantsEl?.value),
          appearance: F,
          attire: T,
          accessories: Acc,
          gender: ["girl", "boy", "other"].includes(String(genderEl?.value || "")) ? String(genderEl.value) : "",
          attire_locked: attireLockedEl ? !!attireLockedEl.checked : true,
          accessories_locked: accLockedEl ? !!accLockedEl.checked : true,
          priority: Number(n.priority || 0)
        };
        let v;
        if (x === "__global__") {
          v = await K("/v1/characters", {
            method: "POST",
            body: {
              session_id: live?.sessionId || rosterSessionId || "",
              scope: "__global__",
              character: edited
            }
          }, 15e3);
        } else if (rosterMeta?.rosterUnified && rosterMeta.unifiedScope) {
          v = await K("/v1/characters", {
            method: "POST",
            body: withRootSessions({
              session_id: rosterSessionId,
              character_id: w(live?.characterId || rosterMeta.characterId || "", 200),
              character: edited
            }, rosterMeta.unifiedScope)
          }, 15e3);
        } else {
          v = await K("/v1/characters", {
            method: "POST",
            body: {
              session_id: live?.sessionId || rosterSessionId || "",
              scope: x,
              character: edited
            }
          }, 15e3);
        }
        if (t.charactersSession = v?.characters || t.charactersSession, t.charactersGlobal = v?.global || t.charactersGlobal, t.appearance = v?.appearance || t.appearance, y("info", "char.edit.save", `${I} → ${rosterMeta?.rosterUnified ? "roots" : x === "__global__" ? "global" : "session"} app=${F.length} attire=${T.length} acc=${Acc.length}`), t.galleryUi?.status?.setTextContent) try {
          await t.galleryUi.status.setTextContent(`캐릭터 저장됨 · ${I}`);
        } catch {
        }
        await xe();
      } catch (v) {
        y("error", "char.edit.save.fail", v?.message || v), E(`저장 실패: ${z(v?.message || v, 80)}`);
      }
    };
    i.querySelector("[data-ce-save]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    }), i.querySelector("[data-ce-cancel]")?.addEventListener("click", (f) => {
      f.preventDefault(), xe().catch(() => {
      });
    }), i.querySelector("[data-ce-x]")?.addEventListener("click", (f) => {
      f.preventDefault(), f.stopPropagation(), U().catch(() => {
      });
    }), (() => {
      const backdrop = i.querySelector("[data-ce-backdrop]");
      if (!backdrop) return;
      // Close only on a real outside click (down+up on dim). Text-drag release outside must not close.
      let downOnBackdrop = !1;
      backdrop.addEventListener("pointerdown", (f) => {
        downOnBackdrop = f.target === backdrop;
      });
      backdrop.addEventListener("pointercancel", () => {
        downOnBackdrop = !1;
      });
      backdrop.addEventListener("click", (f) => {
        const ok = f.target === backdrop && downOnBackdrop;
        downOnBackdrop = !1;
        ok && U().catch(() => {
        });
      });
    })(), i.querySelector("[data-ce-regenerate]")?.addEventListener("click", async (f) => {
      f.preventDefault(), f.stopPropagation();
      const x = t.selectedMessage, I = await Z({ useOverride: !1 }).catch(() => null);
      if (!x) return E("재생성할 메시지를 먼저 선택하세요");
      try {
        const targets = messageCardsByY(x);
        E("관련 이미지 재생성 중…"), await withImageRerollToast(`관련 이미지 재생성 중… (0/${targets.length || "?"})`, async (report) => {
          const result = await rerollMessageImagesLive(x, { scope: I, report });
          if (Array.isArray(result.failed) && result.failed.length) E(`관련 이미지 재생성 부분 실패 · 성공 ${result.count} / 실패 ${result.failed.length}`);
          return result;
        }, { shotCount: Math.max(1, targets.length || 1) }), I?.sessionId && await ce(I.sessionId, !0), await he(), t.galleryUi?.renderGal && await t.galleryUi.renderGal(), E("관련 이미지 재생성 완료");
      } catch (R) {
        E(`재생성 실패: ${z(R?.message || R, 80)}`);
      }
    }), i.querySelector("[data-ce-card]")?.addEventListener("click", (f) => f.stopPropagation()), i.querySelector("[data-ce-form]")?.addEventListener("submit", (f) => {
      f.preventDefault(), U().catch(() => {
      });
    }), t.charEditUi = {
      root: i,
      entryName: e.name,
      openedContainer: r,
      roster: n,
      entry: e
    };
    try {
      s?.focus?.();
    } catch {
    }
    y("info", "char.edit.open", `${n.name || e.name} (${a}) iframe-modal`);
  }

  async function closeCardTagEdit() {
    const e = t.cardTagUi, n = e?.root || (typeof document < "u" ? document.getElementById("nx-card-tag-modal") : null);
    try {
      n?.remove?.();
    } catch {
    }
    const o = !!e?.openedContainer;
    if (t.cardTagUi = null, o && !t.uiOpen && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
    if (t.overlayUi && !t.charEditUi) {
      t.overlayUi._stickyEditorOpen = !1;
      try { await Ht(); } catch {}
    }
  }
  async function closeCharacterCreateModal() {
    const e = t.charCreateUi, n = e?.root || (typeof document < "u" ? document.getElementById("nx-char-create-modal") : null);
    try {
      n?.remove?.();
    } catch {
    }
    const o = !!e?.openedContainer;
    if (t.charCreateUi = null, o && !t.uiOpen && !t.cardTagUi && !t.charEditUi && typeof k.hideContainer == "function") try {
      await k.hideContainer();
    } catch {
    }
  }
  async function openCharacterCreateModal(opts = {}) {
    if (typeof document > "u" || !document.body) throw new Error("plugin document unavailable");
    await closeCharacterCreateModal();
    const rosterResolved = t._viewerRoster || await ensureViewerRosterLoaded().catch(() => null);
    const opened = !t.uiOpen && !t.cardTagUi && !t.charEditUi;
    opened && typeof k.showContainer == "function" && (await k.showContainer("fullscreen"), document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;");
    const field = "width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:13px/1.4 Segoe UI,sans-serif";
    const sessionTag = rosterResolved?.rosterUnified ? "U" : "S";
    const presetLabel = rosterResolved?.rosterUnified ? "캐릭터 프리셋 (통합/글로벌)" : "캐릭터 프리셋 (현재 챗/글로벌)";
    const presetOptions = (() => {
      const Vt = [], Xt = /* @__PURE__ */ new Set(), Yt = (Gt, Kt) => {
        for (const Qt of Gt || []) {
          const me = w(Qt?.name || "", 200);
          if (!me) continue;
          const nn = me.toLowerCase();
          if (Xt.has(nn)) continue;
          Xt.add(nn), Vt.push(`<option value="${h(Kt + "::" + me)}">[${Kt}] ${h(me)}</option>`);
        }
      };
      return Yt(enabledGlobalsForCharacter(), "G"), Yt(t.charactersSession, sessionTag), Vt.join("");
    })();
    const root = document.createElement("div");
    root.id = "nx-char-create-modal", root.setAttribute("data-cc-root", "1"), root.innerHTML = [
      '<div data-cc-backdrop style="position:fixed;inset:0;z-index:100060;background:rgba(4,8,16,.6);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;">',
      '<div data-cc-card style="width:min(720px,100%);max-height:min(94vh,920px);background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(151,139,255,.4);border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden;">',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0">',
      `<div><div style="font-weight:700;font-size:15px">캐릭터 추가</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">${rosterResolved?.rosterUnified ? "현재 라이브 채팅 로스터에 추가 (통합은 모아보기)" : "현재 채팅 로스터에 추가"}</div></div>`,
      '<button type="button" data-cc-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button>',
      "</div>",
      '<div data-cc-body style="padding:14px 16px;display:grid;gap:10px;overflow:auto;flex:1;min-height:0">',
      `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>${presetLabel}</span><select data-cc-preset style="${field}"><option value="">직접 입력</option>${presetOptions}</select></label>`,
      `<div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr) minmax(0,.7fr);gap:8px"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-cc-name value="" style="${field}"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>원본 태그</span><input data-cc-original placeholder="(원작 캐릭터 태그)" style="${field}"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>성별</span><select data-cc-gender style="${field}"><option value="">미정</option><option value="girl">girl</option><option value="boy">boy</option><option value="other">other</option></select></label></div>`,
      `<div style="display:grid;grid-template-columns:32px minmax(0,1fr) minmax(0,1.2fr);gap:6px 8px;align-items:center;padding:8px 10px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03)"><span></span><span style="font-size:10px;font-weight:700;color:#778398">기본</span><span style="font-size:10px;font-weight:700;color:#778398">한·영 표기</span><span style="font-size:11px;font-weight:700;color:#9aa6b8">성</span><input data-cc-surname placeholder="한" style="${field}"><input data-cc-surname-variants placeholder="Han, HAN" style="${field}"><span style="font-size:11px;font-weight:700;color:#9aa6b8">이름</span><input data-cc-given placeholder="진우" style="${field}"><input data-cc-given-variants placeholder="Jinwoo, JINWOO" style="${field}"></div>`,
      `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>트리거/별칭</span><input data-cc-aliases placeholder="한진우, HAN JINWOO, 진우" style="${field}"></label>`,
      `<label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>외형 태그 (옷·무기 제외)</span><textarea data-cc-appearance rows="4" style="${field};resize:vertical;min-height:88px"></textarea></label>`,
      `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px"><div style="display:grid;gap:4px"><div style="display:flex;justify-content:space-between;gap:6px;color:#9aa6b8;font-size:11px;font-weight:600"><span>옷·악세사리</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-attire-locked type="checkbox" checked style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label></div><textarea data-cc-attire rows="3" style="${field};resize:vertical;min-height:64px"></textarea></div><div style="display:grid;gap:4px"><div style="display:flex;justify-content:space-between;gap:6px;color:#9aa6b8;font-size:11px;font-weight:600"><span>무기·기타</span><label style="display:inline-flex;align-items:center;gap:4px;color:#d7deea;font-size:11px;cursor:pointer"><input data-cc-accessories-locked type="checkbox" checked style="width:14px;height:14px;margin:0;accent-color:#7c6cff">고정</label></div><textarea data-cc-accessories rows="3" style="${field};resize:vertical;min-height:64px"></textarea></div></div>`,
      `<div style="display:grid;grid-template-columns:minmax(0,.6fr) minmax(0,1.4fr);gap:8px;align-items:end"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>우선순위</span><input data-cc-priority type="number" value="0" style="${field}"></label><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,196,72,.35);background:rgba(255,196,72,.08)"><button type="button" data-cc-autotag style="cursor:pointer;border:1px solid rgba(255,196,72,.7);background:rgba(255,196,72,.2);color:#ffe7a8;padding:7px 12px;border-radius:9px;font:700 12px Segoe UI,sans-serif">오토태그</button><span data-cc-autotag-status style="color:#c9b56a;font-size:11px;flex:1;min-width:140px">클릭=붙여넣기 대상 · 더블클릭=파일</span></div></div>`,
      "</div>",
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;background:rgba(8,12,20,.96)">',
      '<span data-cc-status style="color:#9aa6b8;font-size:11px">필수: 이름 · 외형 권장</span>',
      '<div style="display:flex;gap:8px"><button type="button" data-cc-cancel style="cursor:pointer;border:0;background:#334155;color:#fff;padding:8px 12px;border-radius:9px;font:12px Segoe UI,sans-serif">취소</button><button type="button" data-cc-save style="cursor:pointer;border:0;background:#7c6cff;color:#fff;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">저장</button></div>',
      "</div></div></div>"
    ].join(""), document.body.appendChild(root);
    const nameEl = root.querySelector("[data-cc-name]"), originalEl = root.querySelector("[data-cc-original]"), genderEl = root.querySelector("[data-cc-gender]"), surnameEl = root.querySelector("[data-cc-surname]"), givenEl = root.querySelector("[data-cc-given]"), surnameVariantsEl = root.querySelector("[data-cc-surname-variants]"), givenVariantsEl = root.querySelector("[data-cc-given-variants]"), aliasesEl = root.querySelector("[data-cc-aliases]"), appearanceEl = root.querySelector("[data-cc-appearance]"), attireEl = root.querySelector("[data-cc-attire]"), accessoriesEl = root.querySelector("[data-cc-accessories]"), attireLockedEl = root.querySelector("[data-cc-attire-locked]"), accLockedEl = root.querySelector("[data-cc-accessories-locked]"), priorityEl = root.querySelector("[data-cc-priority]"), statusEl = root.querySelector("[data-cc-status]"), autotagBtn = root.querySelector("[data-cc-autotag]"), autotagStatus = root.querySelector("[data-cc-autotag-status]"), presetEl = root.querySelector("[data-cc-preset]");
    const setStatus = (msg) => {
      statusEl && (statusEl.textContent = msg);
    }, splitNames = (v) => String(v || "").split(/[,/\n]/).map((Q) => Q.trim()).filter(Boolean);
    const applyPreset = (f) => {
      const x = String(f || "");
      const I = x.startsWith("G::")
        ? enabledGlobalsForCharacter().find((R) => w(R?.name || "", 200) === x.slice(3))
        : x.startsWith("U::") || x.startsWith("S::")
          ? (t.charactersSession || []).find((R) => w(R?.name || "", 200) === x.slice(3))
          : null;
      if (!I) return;
      const R = Array.isArray(I.aliases) ? I.aliases.join(", ") : String(I.aliases || "");
      nameEl && (nameEl.value = w(I.name || "", 200));
      originalEl && (originalEl.value = w(I.original || "", 400));
      surnameEl && (surnameEl.value = w(I.surname || "", 200));
      givenEl && (givenEl.value = w(I.given_name || "", 200));
      surnameVariantsEl && (surnameVariantsEl.value = Array.isArray(I.surname_variants) ? I.surname_variants.join(", ") : String(I.surname_variants || ""));
      givenVariantsEl && (givenVariantsEl.value = Array.isArray(I.given_name_variants) ? I.given_name_variants.join(", ") : String(I.given_name_variants || ""));
      aliasesEl && (aliasesEl.value = R);
      appearanceEl && (appearanceEl.value = w(I.appearance || "", 4e3));
      attireEl && (attireEl.value = w(I.attire || "", 4e3));
      accessoriesEl && (accessoriesEl.value = w(I.accessories || "", 4e3));
      attireLockedEl && (attireLockedEl.checked = I.attire_locked !== false);
      accLockedEl && (accLockedEl.checked = I.accessories_locked !== false);
      if (priorityEl && Number.isFinite(Number(I.priority))) priorityEl.value = String(Number(I.priority) || 0);
      setStatus(`[${x.slice(0, 1)}] ${I.name} 불러옴 · 수정 후 저장하세요`);
    };
    presetEl?.addEventListener("change", () => {
      applyPreset(presetEl.value);
    });
    const setAutotagFocus = (on, label = "선택됨 · Ctrl+V") => {
      t.autotagFocus = on ? { scope: "modal", id: "char-create" } : null;
      if (autotagBtn) autotagBtn.textContent = on ? "붙여넣기 대기" : "오토태그";
      if (autotagStatus) autotagStatus.textContent = on ? "이 팝업 선택됨 · Ctrl+V · 더블클릭=파일" : "클릭=붙여넣기 대상 · 더블클릭=파일", autotagStatus.style.color = on ? "#ffe7a8" : "#c9b56a";
    };
    const runAutotag = async (file) => {
      if (!file) return;
      setAutotagFocus(!0, "분석 중…");
      try {
        const tags = await Lt(file, autotagStatus);
        appearanceEl && (appearanceEl.value = tags.appearance || "");
        attireEl && (attireEl.value = tags.attire || "");
        accessoriesEl && (accessoriesEl.value = tags.accessories || "");
        genderEl && tags.gender && (genderEl.value = tags.gender);
        setStatus("오토태그 반영됨 · 외형/의상/악세/성별 · 저장하세요"), setAutotagFocus(!0, "완료");
      } catch (err) {
        setStatus(`오토태그 실패: ${z(err?.message || err, 80)}`), setAutotagFocus(!0, "실패");
      }
    };
    autotagBtn?.addEventListener("click", (ev) => {
      ev.preventDefault(), ev.stopPropagation();
      const on = t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-create";
      setAutotagFocus(!on);
    }), autotagBtn?.addEventListener("dblclick", (ev) => {
      ev.preventDefault(), ev.stopPropagation(), setAutotagFocus(!0);
      const input = document.createElement("input");
      input.type = "file", input.accept = "image/*", input.style.display = "none", document.body.appendChild(input), input.addEventListener("change", async () => {
        const file = input.files?.[0];
        input.remove(), file && await runAutotag(file);
      }), input.click();
    }), root.addEventListener("paste", async (ev) => {
      if (!(t.autotagFocus?.scope === "modal" && t.autotagFocus?.id === "char-create")) return;
      const item = Array.from(ev.clipboardData?.items || []).find((R) => R.type.startsWith("image/"));
      if (!item) return;
      ev.preventDefault();
      const file = item.getAsFile();
      file && await runAutotag(file);
    });
    const save = async () => {
      const name = w(nameEl?.value || "", 200);
      if (!name) return setStatus("이름이 비어 있습니다");
      const live = await Z({ useOverride: !1 }).catch(() => null);
      const rosterMeta = rosterResolved || t._viewerRoster || await resolveViewerRosterSession().catch(() => null);
      const rosterSessionId = rosterMeta?.rosterSessionId || live?.sessionId || "";
      if (!rosterSessionId) return setStatus("세션 없음");
      const edited = {
        id: `new_${Date.now()}`,
        name,
        original: w(originalEl?.value || "", 400),
        aliases: (() => {
          const g = splitNames(aliasesEl?.value);
          return g.length ? g : [name];
        })(),
        surname: w(surnameEl?.value || "", 200),
        given_name: w(givenEl?.value || "", 200),
        surname_variants: splitNames(surnameVariantsEl?.value),
        given_name_variants: splitNames(givenVariantsEl?.value),
        appearance: w(appearanceEl?.value || "", 4e3),
        attire: w(attireEl?.value || "", 4e3),
        accessories: w(accessoriesEl?.value || "", 4e3),
        gender: ["girl", "boy", "other"].includes(String(genderEl?.value || "")) ? String(genderEl.value) : "",
        attire_locked: attireLockedEl ? !!attireLockedEl.checked : true,
        accessories_locked: accLockedEl ? !!accLockedEl.checked : true,
        priority: Number(priorityEl?.value || 0) || 0
      };
      try {
        setStatus("저장 중…");
        let res;
        // Always create on the live chat — unified is view-only for adds.
        res = await K("/v1/characters", {
          method: "POST",
          body: {
            session_id: live?.sessionId || rosterSessionId,
            scope: live?.sessionId || rosterSessionId,
            character: edited
          }
        }, 15e3);
        if (rosterMeta?.rosterUnified && rosterMeta.unifiedScope) {
          try {
            await ensureUnifiedRoster(rosterMeta.unifiedScope);
          } catch {
          }
        }
        t.charactersSession = res?.characters || t.charactersSession, t.charactersGlobal = res?.global || t.charactersGlobal, t.appearance = res?.appearance || t.appearance;
        if (rosterMeta?.rosterUnified) t.charactersSession = t.charactersSession;
        const saved = (t.charactersSession || []).find((row) => w(row?.name || "", 200).toLowerCase() === name.toLowerCase()) || edited;
        y("info", "char.create", `${name} → live`), await closeCharacterCreateModal(), typeof opts.onCreated == "function" && await opts.onCreated(saved);
      } catch (err) {
        y("error", "char.create.fail", err?.message || err), setStatus(`저장 실패: ${z(err?.message || err, 80)}`);
      }
    };
    root.querySelector("[data-cc-save]")?.addEventListener("click", (ev) => {
      ev.preventDefault(), save().catch(() => {
      });
    }), root.querySelector("[data-cc-cancel]")?.addEventListener("click", (ev) => {
      ev.preventDefault(), closeCharacterCreateModal().catch(() => {
      });
    }), root.querySelector("[data-cc-x]")?.addEventListener("click", (ev) => {
      ev.preventDefault(), closeCharacterCreateModal().catch(() => {
      });
    }), (() => {
      const backdrop = root.querySelector("[data-cc-backdrop]");
      if (!backdrop) return;
      let downOnBackdrop = !1;
      backdrop.addEventListener("pointerdown", (ev) => {
        downOnBackdrop = ev.target === backdrop;
      });
      backdrop.addEventListener("click", (ev) => {
        const ok = ev.target === backdrop && downOnBackdrop;
        downOnBackdrop = !1, ok && closeCharacterCreateModal().catch(() => {
        });
      });
    })(), root.querySelector("[data-cc-card]")?.addEventListener("click", (ev) => ev.stopPropagation());
    t.charCreateUi = { root, openedContainer: opened, slotIndex: opts.slotIndex };
    try {
      nameEl?.focus?.();
    } catch {
    }
  }
  async function openCardTagEdit(e) {
    if (!e?.id) return;
    if (typeof document > "u" || !document.body) {
      y("error", "card.tags.open", "plugin document unavailable");
      return;
    }
    await closeCharacterCreateModal().catch(() => null);
    await closeCardTagEdit(), await xe();
    if (t.overlayUi) t.overlayUi._stickyEditorOpen = !0;
    try { await Ht(); } catch {}
    try {
      await ensureViewerRosterLoaded();
    } catch {
    }
    const MAX = 6, field = "width:100%;box-sizing:border-box;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;padding:8px 10px;font:12px/1.4 Segoe UI,sans-serif", foldBox = "border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);padding:10px 12px", foldSum = "cursor:pointer;list-style:none;font-weight:700;font-size:12px;color:#d7deea;display:flex;align-items:center;justify-content:space-between;gap:8px;user-select:none", PERSON_COUNT_RE = /^\d+\+?(?:girls?|boys?|people|person)$/i, BARE_PERSON_RE = /^(?:girls?|boys?|people|person|solo)$/i, FEMALE_RE = /\b(?:\d+\+?)?girls?\b|\bwom(?:an|en)\b|\bfemale\b|\blady\b|\bladies\b|\bmilf\b|\bloli\b|\bmaiden\b/gi, MALE_RE = /\b(?:\d+\+?)?boys?\b|\bm(?:a|e)n\b|\bmale\b|\bguys?\b|\bgentleman\b|\botoko\b/gi, settingsMode = (() => {
      const Vt = t.backendSettings?.card || {}, Xt = String(Vt.person_tag_mode || "").toLowerCase();
      return ["gender", "girls", "people", "off"].includes(Xt) ? Xt : Vt.auto_person_tags === !1 ? "off" : "gender";
    })(), roster = (() => {
      const Vt = [], Xt = /* @__PURE__ */ new Set(), Yt = (Gt, Kt) => {
        for (const Qt of Gt || []) {
          const me = w(Qt?.name || "", 200);
          if (!me) continue;
          const nn = me.toLowerCase();
          if (Xt.has(nn)) continue;
          Xt.add(nn);
          const Le = [w(Qt.appearance || "", 4e3), w(Qt.attire || "", 4e3), w(Qt.accessories || "", 4e3)].filter(Boolean).join(", ") || w(Qt.tags || "", 4e3) || w(Qt.prompt || "", 4e3);
          Vt.push({
            name: me,
            prompt: Le,
            appearance: w(Qt.appearance || "", 4e3),
            attire: w(Qt.attire || "", 4e3),
            accessories: w(Qt.accessories || "", 4e3),
            scope: Kt,
            id: String(Qt.id || me)
          });
        }
      };
      return Yt(enabledGlobalsForCharacter(), "G"), Yt(t.charactersSession, t._viewerRoster?.rosterUnified ? "U" : "S"), Vt;
    })();
    let slots = (Array.isArray(e.characters) ? e.characters : []).slice(0, MAX).map((Vt) => ({
      name: w(Vt?.name || "", 200),
      prompt: w(Vt?.prompt || "", 4e3),
      raw: Vt && typeof Vt == "object" ? {
        ...Vt
      } : {},
      open: !0
    }));
    // Prefer stored generation prompt (same as image metadata). Rebuild from live
    // roster only when this card has no saved char caption yet.
    for (const slot of slots) {
      if (w(slot.prompt || "", 4e3)) continue;
      const nm = w(slot.name || "", 200);
      if (!nm) continue;
      const match = roster.find((r) => r.name.toLowerCase() === nm.toLowerCase());
      if (!match) continue;
      const looks = match.prompt || [match.appearance, match.attire, match.accessories].filter(Boolean).join(", ");
      if (!looks) continue;
      const raw = slot.raw && typeof slot.raw === "object" ? slot.raw : {};
      const shotBits = [w(raw.expression || "", 400), w(raw.action || "", 400), w(raw.sex || "", 200)].filter(Boolean).join(", ");
      slot.prompt = shotBits ? `${looks}, ${shotBits}` : looks;
    }
    slots.length || (slots = [{
      name: "",
      prompt: "",
      raw: {},
      open: !0
    }]);
    const opened = !t.uiOpen, paraKeep = Number(e.paragraph), shotKeep = Number(e.shot_index), stripPersonCountTags = (Vt) => {
      const raw = String(Vt || "");
      if (!raw.trim()) return "";
      const isPersonWord = (s) => {
        const w = String(s || "").trim();
        return !!w && (PERSON_COUNT_RE.test(w) || BARE_PERSON_RE.test(w));
      };
      const tokens = [];
      const splitRe = /-?\d+(?:\.\d+)?::(?:(?!::).)*?::|[^,]+/g;
      let mm;
      while ((mm = splitRe.exec(raw)) !== null) {
        const tok = mm[0].trim();
        if (tok) tokens.push(tok);
      }
      const kept = [];
      for (const tok of tokens) {
        if (isPersonWord(tok)) continue;
        const weighted = tok.match(/^-?\d+(?:\.\d+)?::([\s\S]*)::$/);
        if (weighted) {
          const inner = weighted[1].split(",").map((s) => s.trim()).filter(Boolean);
          if (inner.length && inner.every(isPersonWord)) continue;
          kept.push(tok);
          continue;
        }
        const openBroken = tok.match(/^-?\d+(?:\.\d+)?::([\s\S]*)$/);
        if (openBroken && isPersonWord(openBroken[1])) continue;
        const closeBroken = tok.match(/^([\s\S]*)::$/);
        if (closeBroken && isPersonWord(closeBroken[1])) continue;
        kept.push(tok);
      }
      return kept.join(", ");
    }, formatCountTag = (Vt, Xt, Yt, Gt) => Vt <= 0 ? "" : Vt === 1 ? Xt : Vt <= 5 ? `${Vt}${Yt}` : Gt, classifyGender = (Vt) => {
      const Xt = String(Vt || "");
      if (!Xt.trim()) return null;
      const Yt = (Xt.match(FEMALE_RE) || []).length, Gt = (Xt.match(MALE_RE) || []).length;
      return Yt > Gt ? "f" : Gt > Yt ? "m" : null;
    }, personTagsForSlots = (Vt, Xt) => {
      const Yt = (Vt || []).filter((me) => w(me.name || "") || w(me.prompt || "")), Gt = Yt.length;
      if (!Gt || Xt === "off") return "";
      if (Xt === "girls") return formatCountTag(Gt, "1girl", "girls", "6+girls");
      if (Xt === "people") return formatCountTag(Gt, "1person", "people", "6+people");
      let Kt = 0, Qt = 0;
      for (const me of Yt) {
        const nn = w(me.name || "", 200), Le = roster.find((ut) => ut.name.toLowerCase() === nn.toLowerCase()), ut = classifyGender([Le?.appearance, Le?.attire, me.prompt, me.name].filter(Boolean).join(", "));
        ut === "f" ? Kt += 1 : ut === "m" && (Qt += 1);
      }
      return [formatCountTag(Kt, "1girl", "girls", "6+girls"), formatCountTag(Qt, "1boy", "boys", "6+boys")].filter(Boolean).join(", ");
    };
    opened && typeof k.showContainer == "function" && (await k.showContainer("fullscreen"), document.body.style.cssText = "margin:0;min-height:100vh;background:transparent;font:13px/1.45 Segoe UI,sans-serif;color:#e2e8f0;");
    const root = document.createElement("div"), initMode = settingsMode === "off" ? "gender" : settingsMode, initAuto = settingsMode !== "off";
    root.id = "nx-card-tag-modal", root.setAttribute("data-ct-root", "1"), root.innerHTML = [
      '<div data-ct-backdrop style="position:fixed;inset:0;z-index:100000;background:rgba(4,8,16,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;">',
      '<div data-ct-card style="width:min(620px,100%);max-height:min(90vh,860px);display:flex;flex-direction:column;overflow:hidden;background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(151,139,255,.4);border-radius:16px;box-shadow:0 28px 80px rgba(0,0,0,.55);">',
      '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)">',
      `<div><div style="font-weight:700;font-size:15px">샷 태그 수정</div><div style="margin-top:3px;color:#9aa6b8;font-size:11px">P${e.paragraph ?? "?"} · ${h(String(e.id || "").slice(0, 8))} · 저장 / 저장·리롤</div></div>`,
      '<button type="button" data-ct-x style="cursor:pointer;border:0;background:rgba(255,255,255,.08);color:#e2e8f0;padding:6px 10px;border-radius:8px">✕</button>',
      "</div>",
      '<div data-ct-body style="flex:1;min-height:0;overflow:auto;padding:14px 16px;display:grid;gap:10px;align-content:start">',
      `<details data-ct-fold="base" open style="${foldBox}"><summary style="${foldSum}"><span>base 태그</span><span style="font-weight:500;color:#778398;font-size:11px">접기/펼치기</span></summary><div style="margin-top:8px;display:grid;gap:8px"><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:#d7deea;font-size:11px;font-weight:600;padding:5px 9px;border-radius:999px;border:1px solid rgba(124,108,255,.35);background:rgba(124,108,255,.12)"><input data-ct-auto-person type="checkbox" ${initAuto ? "checked" : ""} style="accent-color:#7c6cff">인원수 태그 자동</label><select data-ct-person-mode style="min-width:150px;${field}"><option value="gender" ${initMode === "gender" ? "selected" : ""}>성별 1girl/1boy</option><option value="girls" ${initMode === "girls" ? "selected" : ""}>인원 → girls</option><option value="people" ${initMode === "people" ? "selected" : ""}>인원 → people</option></select><button type="button" data-ct-person-apply style="cursor:pointer;border:0;background:#334155;color:#fff;padding:7px 10px;border-radius:8px;font:11px Segoe UI,sans-serif">지금 적용</button><span data-ct-person-hint style="color:#778398;font-size:10px;flex:1;min-width:140px">켜면 base 앞 인원태그 정리 후 char 수에 맞게 삽입</span></div><textarea data-ct-base rows="4" style="${field};font:12px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:96px">${h(e.main_prompt || "")}</textarea></div></details>`,
      `<details data-ct-fold="neg" style="${foldBox}"><summary style="${foldSum}"><span>네거티브</span><span style="font-weight:500;color:#778398;font-size:11px">기본 접힘</span></summary><div style="margin-top:8px"><textarea data-ct-neg rows="2" style="${field};font:12px/1.45 Segoe UI,sans-serif;resize:vertical;min-height:56px">${h(e.negative_prompt || "")}</textarea></div></details>`,
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px"><div style="font-weight:700;font-size:12px;color:#d7deea">캐릭터 슬롯</div><div data-ct-count style="color:#778398;font-size:11px"></div></div>',
      '<div data-ct-slots style="display:grid;gap:10px"></div>',
      "</div>",
      '<div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08);background:rgba(8,12,20,.96)">',
      '<span data-ct-status style="color:#9aa6b8;font-size:11px">저장=태그 유지 · 저장·리롤=수정 태그로 재생성</span>',
      '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">',
      '<button type="button" data-ct-cancel style="cursor:pointer;border:0;background:#334155;color:#fff;padding:8px 12px;border-radius:9px;font:12px Segoe UI,sans-serif">취소</button>',
      '<button type="button" data-ct-save-only style="cursor:pointer;border:1px solid rgba(124,108,255,.45);background:rgba(124,108,255,.16);color:#e8e4ff;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">저장</button>',
      '<button type="button" data-ct-save style="cursor:pointer;border:0;background:#7c6cff;color:#fff;padding:8px 14px;border-radius:9px;font:600 12px Segoe UI,sans-serif">저장·리롤</button>',
      "</div></div></div></div>"
    ].join(""), document.body.appendChild(root);
    const baseEl = root.querySelector("[data-ct-base]"), negEl = root.querySelector("[data-ct-neg]"), statusEl = root.querySelector("[data-ct-status]"), slotsEl = root.querySelector("[data-ct-slots]"), countEl = root.querySelector("[data-ct-count]"), autoEl = root.querySelector("[data-ct-auto-person]"), modeEl = root.querySelector("[data-ct-person-mode]"), hintEl = root.querySelector("[data-ct-person-hint]"), setStatus = (Vt) => {
      statusEl && (statusEl.textContent = Vt);
    }, syncFromDom = () => {
      const Vt = [];
      for (let Xt = 0; Xt < slots.length; Xt += 1) {
        const Yt = root.querySelector(`[data-ct-name="${Xt}"]`), Gt = root.querySelector(`[data-ct-prompt="${Xt}"]`), Kt = root.querySelector(`details[data-ct-slotfold="${Xt}"]`);
        Vt.push({
          name: w(Yt?.value || slots[Xt]?.name || "", 200),
          prompt: w(Gt?.value || slots[Xt]?.prompt || "", 4e3),
          raw: slots[Xt]?.raw && typeof slots[Xt].raw == "object" ? {
            ...slots[Xt].raw
          } : {},
          open: Kt ? !!Kt.open : slots[Xt]?.open !== !1
        });
      }
      slots = Vt;
    }, currentMode = () => {
      const Vt = String(modeEl?.value || "gender");
      return ["gender", "girls", "people"].includes(Vt) ? Vt : "gender";
    }, applyAutoPerson = (Vt = !1) => {
      if (!baseEl) return "";
      if (!autoEl?.checked) {
        Vt && setStatus("인원수 태그 자동 꺼짐");
        return "";
      }
      syncFromDom();
      const Xt = currentMode(), YtPlain = personTagsForSlots(slots, Xt), personWeight = (() => {
        const n = Number(t.backendSettings?.card?.person_tag_weight);
        return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 3;
      })(), Yt = YtPlain && personWeight > 0 ? `${personWeight}::${YtPlain}::` : YtPlain, Gt = stripPersonCountTags(baseEl.value || ""), Kt = Yt ? Yt + (Gt ? `, ${Gt}` : "") : Gt;
      return baseEl.value = Kt, hintEl && (hintEl.textContent = Yt ? `적용: ${Yt}` : "채울 char가 없어 인원태그 없음"), Vt && setStatus(Yt ? `인원수 태그 적용 · ${Yt}` : "인원수 태그 없음"), Yt;
    }, pickOptions = (Vt) => {
      const Xt = [`<option value="">선택…</option>`, `<option value="__add_character__">캐릭터 추가++</option>`];
      for (const Yt of roster) {
        const Gt = Vt && Yt.name.toLowerCase() === String(Vt).toLowerCase() ? " selected" : "";
        Xt.push(`<option value="${h(Yt.name)}"${Gt}>[${Yt.scope}] ${h(Yt.name)}</option>`);
      }
      return Xt.join("");
    }, previewOf = (Vt) => {
      const Xt = w(Vt?.name || "", 200), Yt = w(Vt?.prompt || "", 80);
      return Xt ? Yt ? `${Xt} · ${Yt}` : Xt : Yt || "비어 있음";
    }, rebuildRosterList = () => {
      roster.length = 0;
      const Xt = /* @__PURE__ */ new Set(), Yt = (Gt, Kt) => {
        for (const Qt of Gt || []) {
          const me = w(Qt?.name || "", 200);
          if (!me) continue;
          const nn = me.toLowerCase();
          if (Xt.has(nn)) continue;
          Xt.add(nn);
          const Le = [w(Qt.appearance || "", 4e3), w(Qt.attire || "", 4e3), w(Qt.accessories || "", 4e3)].filter(Boolean).join(", ") || w(Qt.tags || "", 4e3) || w(Qt.prompt || "", 4e3);
          roster.push({
            name: me,
            prompt: Le,
            appearance: w(Qt.appearance || "", 4e3),
            attire: w(Qt.attire || "", 4e3),
            accessories: w(Qt.accessories || "", 4e3),
            scope: Kt,
            id: String(Qt.id || me)
          });
        }
      };
      Yt(enabledGlobalsForCharacter(), "G"), Yt(t.charactersSession, t._viewerRoster?.rosterUnified ? "U" : "S");
    }, renderSlots = () => {
      if (!slotsEl) return;
      countEl && (countEl.textContent = `${slots.length} / ${MAX}`), slotsEl.innerHTML = slots.map((Vt, Xt) => `<details data-ct-slotfold="${Xt}" ${Vt.open === !1 ? "" : "open"} style="${foldBox}"><summary style="${foldSum}"><span>char${Xt + 1}<span style="font-weight:500;color:#9aa6b8;margin-left:8px">${h(previewOf(Vt))}</span></span><span style="display:flex;gap:6px;align-items:center"><button type="button" data-ct-del="${Xt}" ${slots.length <= 1 ? "disabled" : ""} style="cursor:${slots.length <= 1 ? "not-allowed" : "pointer"};border:0;background:${slots.length <= 1 ? "rgba(255,255,255,.04)" : "rgba(248,113,113,.16)"};color:${slots.length <= 1 ? "#64748b" : "#fecaca"};padding:4px 9px;border-radius:8px;font:11px Segoe UI,sans-serif">삭제</button><span style="font-weight:500;color:#778398;font-size:11px">접기</span></span></summary><div style="margin-top:10px;display:grid;gap:8px"><div style="display:grid;grid-template-columns:minmax(0,1.1fr) minmax(140px,.9fr);gap:8px;align-items:end"><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>이름</span><input data-ct-name="${Xt}" value="${h(Vt.name || "")}" style="${field}"></label><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>캐릭터</span><select data-ct-pick="${Xt}" style="${field}">${pickOptions(Vt.name)}</select></label></div><label style="display:grid;gap:4px;color:#9aa6b8;font-size:11px"><span>캐릭터 태그 (prompt)</span><textarea data-ct-prompt="${Xt}" rows="3" style="${field};resize:vertical;min-height:68px">${h(Vt.prompt || "")}</textarea></label></div></details>`).join("") + (slots.length < MAX ? `<button type="button" data-ct-add style="cursor:pointer;border:1px dashed rgba(255,255,255,.22);background:rgba(255,255,255,.03);color:#c7d2fe;padding:10px 12px;border-radius:12px;font:600 12px Segoe UI,sans-serif">+ char 추가 · ${slots.length + 1}/${MAX}</button>` : '<div style="color:#64748b;font-size:11px;text-align:center;padding:4px 0">최대 6명까지</div>');
      slotsEl.querySelectorAll("[data-ct-del]").forEach((Vt) => {
        Vt.addEventListener("click", (Xt) => {
          Xt.preventDefault(), Xt.stopPropagation();
          const Yt = Number(Vt.getAttribute("data-ct-del"));
          if (!Number.isFinite(Yt) || slots.length <= 1) return;
          syncFromDom(), slots.splice(Yt, 1), renderSlots(), applyAutoPerson(!0), setStatus(`char${Yt + 1} 삭제됨`);
        });
      }), slotsEl.querySelectorAll("[data-ct-pick]").forEach((Vt) => {
        Vt.addEventListener("change", () => {
          const Xt = Number(Vt.getAttribute("data-ct-pick")), Yt = String(Vt.value || "");
          if (Yt === "__add_character__") {
            Vt.value = "";
            openCharacterCreateModal({
              slotIndex: Xt,
              onCreated: async (created) => {
                await ensureViewerRosterLoaded().catch(() => null);
                rebuildRosterList();
                syncFromDom();
                if (slots[Xt] && created?.name) {
                  const Gt = roster.find((me) => me.name.toLowerCase() === String(created.name).toLowerCase()) || {
                    name: created.name,
                    prompt: [created.appearance, created.attire, created.accessories].filter(Boolean).join(", ")
                  };
                  slots[Xt].name = Gt.name, slots[Xt].prompt = Gt.prompt || slots[Xt].prompt, slots[Xt].open = !0;
                }
                renderSlots(), applyAutoPerson(!1), setStatus(`캐릭터 추가됨 · ${created?.name || ""}`);
              }
            }).catch((err) => setStatus(`추가 실패: ${z(err?.message || err, 80)}`));
            return;
          }
          const Gt = roster.find((me) => me.name === Yt);
          if (syncFromDom(), !slots[Xt]) return;
          if (Gt) {
            slots[Xt].name = Gt.name, slots[Xt].prompt = Gt.prompt || slots[Xt].prompt, slots[Xt].open = !0;
            const Kt = root.querySelector(`[data-ct-name="${Xt}"]`), Qt = root.querySelector(`[data-ct-prompt="${Xt}"]`);
            Kt && (Kt.value = Gt.name), Qt && (Qt.value = Gt.prompt || ""), applyAutoPerson(!1), setStatus(`[${Gt.scope}] ${Gt.name} 적용됨 · 저장하세요`);
          }
        });
      });
      const Vt = slotsEl.querySelector("[data-ct-add]");
      Vt && Vt.addEventListener("click", (Xt) => {
        Xt.preventDefault(), Xt.stopPropagation(), syncFromDom(), slots.length >= MAX || (slots.push({
          name: "",
          prompt: "",
          raw: {},
          open: !0
        }), renderSlots(), applyAutoPerson(!0), setStatus(`char${slots.length} 추가됨`));
      }), applyAutoPerson(!1);
    }, collectPayload = () => {
      syncFromDom(), applyAutoPerson(!1);
      const Vt = [];
      for (let Yt = 0; Yt < slots.length; Yt += 1) {
        const Gt = slots[Yt], Kt = w(Gt.name || "", 200), Qt = w(Gt.prompt || "", 4e3);
        if (!Kt && !Qt) continue;
        Vt.push({
          ...(Gt.raw && typeof Gt.raw == "object" ? Gt.raw : {}),
          name: Kt || `char${Yt + 1}`,
          prompt: Qt || "girl"
        });
      }
      return {
        main_prompt: w(baseEl?.value || "", 8e3),
        negative_prompt: w(negEl?.value || "", 8e3),
        characters: Vt
      };
    }, refreshGalleryAfterTagSave = async (cardId, keepPara, keepShot, nextId = "") => {
      const Kt = await Z({ useOverride: !1 }).catch(() => null);
      if (Kt?.sessionId && await ce(Kt.sessionId, !0), t.galleryUi) {
        const Qt = t.selectedMessage ? ke(t.selectedMessage) : t.galleryUi.items || [], me = nextId ? Qt.findIndex((nn) => nn.id === nextId) : -1, nn = me >= 0 ? me : Qt.findIndex((Le) => Number(Le.paragraph) === keepPara && Number(Le.shot_index) === keepShot);
        nn >= 0 && (t.galleryUi.index = nn), t.galleryUi.renderGal && await t.galleryUi.renderGal();
      }
      try {
        await he();
      } catch {
      }
    }, saveOnly = async () => {
      const payload = collectPayload(), cardId = e.id, keepPara = paraKeep, keepShot = shotKeep;
      try {
        setStatus("저장 중…"), await K(`/v1/cards/${encodeURIComponent(cardId)}/tags`, {
          method: "POST",
          body: payload
        }, 15e3), y("info", "card.tags.save", `${String(cardId).slice(0, 8)} chars=${payload.characters.length} only`), await closeCardTagEdit(), await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, cardId), t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(`태그 저장됨 · ${String(cardId).slice(0, 8)}`);
      } catch (Yt) {
        y("error", "card.tags.save.fail", Yt?.message || Yt);
        try {
          t.cardTagUi?.root && setStatus(`실패: ${z(Yt?.message || Yt, 80)}`);
        } catch {
        }
      }
    }, save = async () => {
      const payload = collectPayload(), cardId = e.id, keepPara = paraKeep, keepShot = shotKeep;
      try {
        setStatus("저장 중…"), await K(`/v1/cards/${encodeURIComponent(cardId)}/tags`, {
          method: "POST",
          body: payload
        }, 15e3), y("info", "card.tags.save", `${String(cardId).slice(0, 8)} chars=${payload.characters.length} autoPerson=${!!autoEl?.checked}`), await closeCardTagEdit();
        const Yt = await withImageRerollToast("태그 저장 후 리롤 중…", async () => await K(`/v1/cards/${encodeURIComponent(cardId)}/reroll`, {
          method: "POST",
          body: {
            mode: "nai",
            overrides: {
              main_prompt: payload.main_prompt,
              negative_prompt: payload.negative_prompt,
              characters: payload.characters
            }
          }
        }, 18e4)), Gt = String(Yt?.card?.id || "");
        await refreshGalleryAfterTagSave(cardId, keepPara, keepShot, Gt), t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(`저장·리롤 완료 · ${String(Gt || cardId).slice(0, 8)}`), y("info", "card.tags.reroll", `${String(cardId).slice(0, 8)}→${String(Gt).slice(0, 8)}`);
      } catch (Yt) {
        y("error", "card.tags.save.fail", Yt?.message || Yt);
        try {
          t.cardTagUi?.root && setStatus(`실패: ${z(Yt?.message || Yt, 80)}`);
        } catch {
        }
        t.galleryUi?.status?.setTextContent && await t.galleryUi.status.setTextContent(`저장·리롤 실패: ${z(Yt?.message || Yt, 80)}`);
      }
    };
    autoEl?.addEventListener("change", () => {
      applyAutoPerson(!0);
    }), modeEl?.addEventListener("change", () => {
      autoEl?.checked && applyAutoPerson(!0);
    }), root.querySelector("[data-ct-person-apply]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation(), autoEl && (autoEl.checked = !0), applyAutoPerson(!0);
    }), root.querySelector("[data-ct-save]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation(), save().catch(() => {
      });
    }), root.querySelector("[data-ct-save-only]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation(), saveOnly().catch(() => {
      });
    }), root.querySelector("[data-ct-cancel]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), closeCardTagEdit().catch(() => {
      });
    }), root.querySelector("[data-ct-x]")?.addEventListener("click", (Vt) => {
      Vt.preventDefault(), Vt.stopPropagation(), saveOnly().catch(() => {
      });
    }), (() => {
      const backdrop = root.querySelector("[data-ct-backdrop]");
      if (!backdrop) return;
      let downOnBackdrop = !1;
      backdrop.addEventListener("pointerdown", (Vt) => {
        downOnBackdrop = Vt.target === backdrop;
      });
      backdrop.addEventListener("pointercancel", () => {
        downOnBackdrop = !1;
      });
      backdrop.addEventListener("click", (Vt) => {
        const ok = Vt.target === backdrop && downOnBackdrop;
        downOnBackdrop = !1;
        ok && saveOnly().catch(() => {
        });
      });
    })(), root.querySelector("[data-ct-card]")?.addEventListener("click", (Vt) => Vt.stopPropagation()), renderSlots(), t.cardTagUi = {
      root,
      cardId: e.id,
      openedContainer: opened
    };
    try {
      baseEl?.focus?.();
    } catch {
    }
    y("info", "card.tags.open", `P${e.paragraph ?? "?"} ${String(e.id).slice(0, 8)} roster=${roster.length} autoPerson=${initAuto}`);
  }

  async function st() {
    await closeCardTagEdit(), await xe();
    const e = t.galleryUi;
    try {
      e?._spinTimer && clearInterval(e._spinTimer);
    } catch {
    }
    if (e?._thumbWheel && e?._thumbWheelTargets?.length) {
      for (const target of e._thumbWheelTargets) {
        try {
          target?.removeEventListener?.("wheel", e._thumbWheel, !0);
        } catch {
        }
      }
    }
    if (e?.wheelId != null && e?.doc?.removeEventListener) try {
      await D("rmGalWheel", () => e.doc.removeEventListener(e.wheelId), null);
    } catch {
    }
    if (e?._winResizeBound && e?._onWinResize && typeof window < "u") try {
      window.removeEventListener("resize", e._onWinResize);
    } catch {
    }
    e?.pointerId != null && e?.doc?.removeEventListener && await D("rmGalPtr", () => e.doc.removeEventListener(e.pointerId), null), e?.pointerUpId != null && e?.doc?.removeEventListener && await D("rmGalPtrUp", () => e.doc.removeEventListener(e.pointerUpId), null), e?.dblId != null && e?.doc?.removeEventListener && await D("rmGalDbl", () => e.doc.removeEventListener(e.dblId), null), e?.previewDblId != null && await de(e.preview, "dblclick", e.previewDblId), e?.presetChangeId != null && await de(e.presetSelect, "change", e.presetChangeId), e?.presetInputId != null && await de(e.presetSelect, "input", e.presetInputId), await rt(V), t.galleryUi = null, t.viewerOpen = !1;
  }
  async function lt() {
    if (t.uiOpen) return;
    if (t.galleryUi?.root) {
      t.galleryUi.renderGal && await t.galleryUi.renderGal();
      return;
    }
    const e = await ue();
    if (!e) return;
    const n = await Ee(e);
    if (!n || typeof e.createElement != "function") return;
    await st();
    const o = await Aa(), iconGeoInit = await loadViewerIconGeo(), minimizedInit = await loadViewerMinimized(), castOpenInit = await Pa();
    t.viewerMinimized = minimizedInit;
    // Toolbar mode stays at the expanded window spot; only icon mode parks at iconGeo.
    const startGeo = minimizedInit ? clampViewerGeo(viewerMinimizeMode() === "toolbar" ? o : {
      ...o,
      left: iconGeoInit.left,
      top: iconGeoInit.top
    }, !0) : o;
    const a = await H(e, "div", {
      className: V,
      style: "position:fixed;left:0;top:0;width:0;height:0;z-index:99990;pointer-events:none;"
    });
    await n.appendChild(a);
    const r = await H(e, "div", { style: Ft(startGeo, minimizedInit) }), i = await H(e, "div", { style: "height:36px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 10px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.06);cursor:move;user-select:none;flex-shrink:0;touch-action:none;" }), s = await H(e, "span", {
      style: "font-weight:600;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:0 1 auto;min-width:0;",
      html: "Inlay Viewer"
    }), viewerPresetLabel = (() => {
      const card = kt(t.backendSettings?.card || {}), presets = Array.isArray(card.presets) ? card.presets : [], activeId = resolveActivePresetId(card), active = presets.find((p) => presetIdEq(p.id, activeId));
      const name = String(active?.name || (presets.length ? "프리셋" : "없음"));
      return `${name.length > 12 ? `${name.slice(0, 11)}…` : name} ▾`;
    })(), viewerPresetBtn = await H(e, "span", {
      // Risu SafeDOM blocks change/input events — use clickable control + pointer hit-test instead of <select>.
      style: "max-width:140px;min-width:88px;flex:0 1 140px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;",
      text: viewerPresetLabel
    }), viewerPresetMenu = await H(e, "div", {
      style: "display:none;position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:5;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;",
      html: ""
    }), c = await H(e, "div", {
      style: "display:flex;gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;",
      html: [
        '<span style="cursor:pointer;background:#475569;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">◀</span>',
        '<span style="cursor:pointer;background:#475569;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">▶</span>',
        '<span style="cursor:pointer;background:#0f766e;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1" title="LLM 태그 재생성">태그</span>',
        '<span style="cursor:pointer;background:#7c6cff;color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1" title="이 메시지의 모든 샷 재생성">재생성</span>',
        `<span style="cursor:pointer;background:${Nt() ? "#0f766e" : "#334155"};color:#fff;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1">${Nt() ? "상시ON" : "상시"}</span>`,
        `<span style="cursor:pointer;display:${(t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "inline-flex" : "none"};background:#334155;color:#dbe4f5;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.12)">설정</span>`,
        `<span style="cursor:pointer;background:#1e293b;color:#dbe4f5;padding:4px 8px;border-radius:7px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.12)">${minimizedInit ? "펼치기" : "접기"}</span>`
      ].join("")
    });
    await i.appendChild(s), await i.appendChild(viewerPresetBtn), await i.appendChild(c);
    const p = await H(e, "div", { style: "display:none;" }), m = await H(e, "div", { style: "display:none;", text: "" }), u = await H(e, "div", { style: "display:none;" });
    await p.appendChild(m), await p.appendChild(u);
    const b = await H(e, "div", { style: `flex:1;min-height:0;overflow:auto;padding:8px 10px;display:${minimizedInit ? "none" : "flex"};flex-direction:column;gap:6px;` }), S = await H(e, "div", {
      style: imageStageStyle(o),
      html: '<span style="color:#778398;font-size:12px">이미지 없음</span>'
    }), C = await H(e, "div", {
      style: "color:#a6b1c2;font-size:11px;flex-shrink:0;min-height:28px;max-height:40px;overflow:hidden;line-height:1.2;",
      text: "메시지를 클릭해서 선택하세요"
    // Native overflow-x so browser wheel / middle-drag autoscroll can move the strip.
    // (JS scrollLeft via SafeDOM is unreliable; custom window.wheel was also bound to the wrong window.)
    }), E = await H(e, "div", { style: "display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding-bottom:2px;flex-shrink:0;min-height:92px;max-height:92px;align-items:center;width:100%;box-sizing:border-box;" }), j = await H(e, "div", { style: "display:flex;flex-wrap:nowrap;gap:6px;align-items:center;color:#a6b1c2;font-size:11px;flex:0 0 auto;min-height:34px;height:34px;max-height:34px;overflow:hidden;cursor:pointer;pointer-events:auto;box-sizing:border-box;" });
    await b.appendChild(S), await b.appendChild(C), await b.appendChild(E), await b.appendChild(j), await r.appendChild(i), await r.appendChild(viewerPresetMenu), await r.appendChild(p), await r.appendChild(b), await a.appendChild(r);
    const d = {
      doc: e,
      root: a,
      panel: r,
      header: i,
      bar: c,
      title: s,
      presetSelect: viewerPresetBtn,
      presetMenu: viewerPresetMenu,
      presetMenuOpen: !1,
      viewerPresetIds: [],
      status: C,
      preview: S,
      thumbs: E,
      meta: j,
      castPanel: p,
      castChips: u,
      castHint: m,
      castOpen: !1,
      bodyBox: b,
      minimized: minimizedInit,
      expandedH: Math.max(280, o.h || 560),
      expandedGeo: {
        left: o.left,
        top: o.top,
        w: o.w,
        h: o.h
      },
      iconGeo: {
        left: iconGeoInit.left,
        top: iconGeoInit.top
      },
      sizeLocked: !0,
      castEntries: [],
      geo: startGeo,
      index: 0,
      items: [],
      pointerId: null,
      drag: null,
      lastPreviewTap: 0,
      lastMainId: "",
      selectedCount: 0,
      _metaGen: 0,
      _metaCardId: "",
      metaHits: []
    };
    t.galleryUi = d, t.viewerOpen = !0;
    const galleryFocusOf = () => {
      const VC = globalThis.__INLAY_VIEWER_CORE__, all = Array.isArray(t.gallery) ? t.gallery : [];
      if (typeof VC?.galleryFocusMessage == "function") return VC.galleryFocusMessage(t.selectedMessage, t.lastImagedMessage, all);
      const sel = t.selectedMessage;
      if (sel && linkedCards(sel).length) return sel;
      return t.lastImagedMessage || sel;
    }, U = () => {
      const A = galleryFocusOf(), all = Array.isArray(t.gallery) ? t.gallery : [], order = globalThis.__INLAY_VIEWER_CORE__?.galleryForMessage;
      if (typeof order === "function") return order(all, A, 8);
      return A ? ke(A) : [...all].sort((x, y) => Number(y.created_at || 0) - Number(x.created_at || 0)).slice(0, 8);
    }, selectedCountOf = (items) => {
      const focus = galleryFocusOf(), fn = globalThis.__INLAY_VIEWER_CORE__?.gallerySelectedCount;
      if (typeof fn === "function") return fn(items, focus);
      if (!focus) return 0;
      return (items || []).filter((card) => (card?.content_hash && card.content_hash === focus.hash) || Number(card?.message_index) === Number(focus.chatIndex)).length;
    }, f = async () => {
      d.geo = clampViewerGeo(d.geo, d.minimized);
      let panelStyle = Ft(d.geo, d.minimized);
      // Toolbar-minimized keeps the same header controls; dropdown must escape the 40px bar.
      if (d.presetMenuOpen && (!d.minimized || viewerMinimizeMode() === "toolbar")) {
        panelStyle = panelStyle.replace(/overflow:[^;]+/i, "overflow:visible");
      }
      await r.setStyleAttribute(panelStyle);
      if (!d.minimized) try {
        await S.setStyleAttribute(imageStageStyle(d.geo));
      } catch {
      }
    }, applyViewerChrome = async () => {
      const mode = viewerMinimizeMode(), toolbarMin = d.minimized && mode === "toolbar", iconMin = d.minimized && mode === "icon";
      try {
        await s.setInnerHTML(iconMin ? "🖼️" : "Inlay Viewer"), await i.setStyleAttribute(`height:${iconMin ? 48 : toolbarMin ? 40 : 36}px;display:flex;align-items:center;justify-content:${iconMin ? "center" : "space-between"};gap:8px;padding:${iconMin ? "0" : "0 10px"};background:rgba(255,255,255,.04);border-bottom:${d.minimized && !toolbarMin ? "0" : "1px solid rgba(255,255,255,.06)"};cursor:move;user-select:none;flex-shrink:0;touch-action:none;`), await viewerPresetBtn.setStyleAttribute(`max-width:140px;min-width:88px;flex:0 1 140px;height:26px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;color:#e8eef8;font-size:11px;padding:0 8px;cursor:pointer;pointer-events:auto;display:${iconMin ? "none" : "inline-flex"};align-items:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-sizing:border-box;`), await viewerPresetMenu.setStyleAttribute(`display:${!iconMin && d.presetMenuOpen ? "block" : "none"};position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:5;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;`), await c.setStyleAttribute(`display:${iconMin ? "none" : "flex"};gap:5px;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;`);
      } catch {
      }
      try {
        await b.setStyleAttribute(`flex:1;min-height:0;overflow:auto;padding:8px 10px;display:${d.minimized ? "none" : "flex"};flex-direction:column;gap:6px;`);
      } catch {
      }
      try {
        await p.setStyleAttribute("display:none;");
      } catch {
      }
      await f();
    }, x = async () => {
      if (d.minimized) {
        const left = Math.round(d.geo.left), top = Math.round(d.geo.top);
        if (viewerMinimizeMode() === "icon") {
          d.iconGeo = {
            left,
            top
          }, await saveViewerIconGeo(d.iconGeo);
        } else {
          // Toolbar: dragging the one-line bar moves the parked window itself.
          d.expandedGeo = {
            ...(d.expandedGeo || {
              w: d.geo.w,
              h: d.geo.h
            }),
            left,
            top
          }, await qt(d.expandedGeo);
        }
        d.geo = clampViewerGeo({
          ...d.expandedGeo,
          left,
          top
        }, !0), await f();
        return;
      }
      await v(), d.geo = clampViewerGeo(d.geo, !1), d.expandedGeo = {
        left: d.geo.left,
        top: d.geo.top,
        w: d.geo.w,
        h: d.geo.h
      }, await qt(d.geo), await f();
    }, I = async () => {
      try {
        const A = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await c.getChildren()) : [], inlineOn = Nt();
        // 0◀ 1▶ 2태그 3재생성 4상시 5설정 6접기
        const labels = [
          null,
          null,
          null,
          null,
          inlineOn ? "상시ON" : "상시",
          (t.backendSettings?.card || {}).show_risu_settings_button !== !1 ? "설정" : "",
          d.minimized ? "펼치기" : "접기"
        ], colors = [
          null,
          null,
          null,
          null,
          inlineOn ? "#0f766e" : "#334155",
          "#334155",
          "#1e293b"
        ];
        for (let idx = 4; idx <= 6; idx += 1) {
          const el = A[idx];
          if (!el) continue;
          if (idx === 5 && !labels[idx]) {
            typeof el.setStyleAttribute == "function" && await el.setStyleAttribute("display:none");
            continue;
          }
          typeof el.setInnerHTML == "function" && labels[idx] && await el.setInnerHTML(labels[idx]);
          typeof el.setStyleAttribute == "function" && colors[idx] && await el.setStyleAttribute(`cursor:pointer;${idx === 5 ? "display:inline-flex;" : ""}background:${colors[idx]};color:${idx === 4 ? "#fff" : "#dbe4f5"};padding:4px 8px;border-radius:7px;font-size:11px;line-height:1;border:1px solid rgba(255,255,255,.12)`);
        }
      } catch {
      }
    }, R = (A) => {
      const _ = Array.isArray(A?.characters) ? A.characters : [], O = [], G = /* @__PURE__ */ new Set();
      return _.forEach((B, W) => {
        const J = w(B?.name || B?.raw?.name || "", 200);
        if (!J) return;
        const Q = J.toLowerCase();
        if (G.has(Q)) return;
        G.add(Q);
        const me = Dt(J);
        O.push({
          index: W,
          name: me?.name || J,
          roster: me,
          prompt: w(B?.prompt || "", 400),
          scope: me?.scope || ""
        });
      }), O;
    }, g = async () => {
      d.castEntries = [];
      try {
        await p.setStyleAttribute("display:none;");
        await u.setInnerHTML("");
      } catch {
      }
      await I();
    };
    d.renderCast = g;
    d.applyChrome = applyViewerChrome;
    const F = async () => {
      await openCardTagEdit(U()[d.index]);
    }, toggleMinimizeBtn = async () => {
      const mode = viewerMinimizeMode();
      if (d.minimized) {
        const curLeft = Math.round(d.geo.left), curTop = Math.round(d.geo.top);
        if (mode === "icon") {
          d.iconGeo = {
            left: curLeft,
            top: curTop
          }, await saveViewerIconGeo(d.iconGeo);
        }
        const eg = d.expandedGeo || {
          left: se.left,
          top: se.top,
          w: se.w,
          h: Math.max(280, d.expandedH || 560)
        };
        // Toolbar expands in place; icon mode restores the saved expanded window spot.
        d.minimized = !1, d.geo = clampViewerGeo({
          ...eg,
          left: mode === "toolbar" ? curLeft : eg.left,
          top: mode === "toolbar" ? curTop : eg.top,
          h: Math.max(280, d.expandedH || eg.h || 560)
        }, !1);
      } else {
        try {
          const rect = await r.getBoundingClientRect();
          rect?.height > 80 && (d.expandedH = Math.max(280, rect.height), d.geo.h = d.expandedH);
        } catch {
        }
        d.expandedGeo = {
          left: Math.round(d.geo.left),
          top: Math.round(d.geo.top),
          w: Math.round(d.geo.w),
          h: Math.round(d.geo.h)
        }, await qt(d.expandedGeo);
        if (mode === "toolbar") {
          // Collapse in place — do not jump to floating-icon coordinates.
          d.minimized = !0, d.geo = clampViewerGeo({
            ...d.expandedGeo
          }, !0);
        } else {
          const ig = d.iconGeo || {
            ...iconSe
          };
          d.minimized = !0, d.geo = clampViewerGeo({
            ...d.expandedGeo,
            left: ig.left,
            top: ig.top
          }, !0);
        }
      }
      await saveViewerMinimized(d.minimized), await applyViewerChrome(), await I(), y("info", "viewer.minimize", d.minimized ? `min:${mode}` : `expand:${mode}`);
    }, paintStatus = async () => {
      const _ = Array.isArray(d.items) ? d.items : U(), O = t.selectedMessage, B = t.jobProgress, idx = readIndexProgress(B), busy = !!(B || O?.hash && t.jobsInFlight.has(O.hash) || idx.busy), extra = O ? `${_.length}장 · DOM#${O.domIndex}` : "";
      try {
        if (busy && (B || idx.busy)) await C.setInnerHTML(viewerStatusHtml(B || { state: "running", progress: idx.pct, message: idx.label }, extra));
        else if (O) await C.setInnerHTML(`<span style="color:#a6b1c2">${h(`${_.length}장 · DOM#${O.domIndex} · ${O.preview || ""}`)}</span>`);
        else await C.setInnerHTML(`<span style="color:#a6b1c2">메시지를 클릭해서 선택하세요</span>`);
      } catch {
      }
      // Toggle CSS spinner on main stage without waiting on image reload.
      try {
        const showSpin = !!(B && formatViewerJob(B)?.busy);
        if (showSpin !== d._mainBusyShown) {
          d._mainBusyShown = showSpin;
          const Q = _[d.index];
          if (Q && Ie(Q)) await S.setInnerHTML(mainImgHtml(Q));
        }
      } catch {
      }
    }, mainImgHtml = (Q, forcedSrc = "") => {
      const busy = !!(t.jobProgress && formatViewerJob(t.jobProgress)?.busy);
      // SMIL spin — no CSS keyframes / no JS interval (works inside SafeDOM).
      const spin = busy ? `<svg data-nx-busy-spin="1" width="18" height="18" viewBox="0 0 18 18" style="position:absolute;left:8px;top:8px;z-index:3;pointer-events:none" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2"/><circle cx="9" cy="9" r="7" fill="none" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" stroke-dasharray="11 33"><animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="0.7s" repeatCount="indefinite"/></circle></svg>` : "";
      const src = forcedSrc || Ie(Q) || d._lastMainSrc || "";
      return `<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">${spin}<span data-nx-img-reroll="1" style="position:absolute;right:8px;top:8px;z-index:3;cursor:pointer;background:rgba(124,108,255,.92);color:#fff;padding:5px 10px;border-radius:8px;font-size:11px;line-height:1;font-weight:600;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 10px rgba(0,0,0,.35);user-select:none" title="이 이미지만 리롤">리롤</span><img data-nx-main-img="1" src="${src}" style="max-width:100%;max-height:100%;object-fit:contain" loading="eager" decoding="async" /></div>`;
    }, ensureCardImage = async (Q) => {
      if (!Q?.id) return Q;
      if (Ie(Q)) return Q;
      try {
        const N = globalThis.__INLAY_NATIVE__;
        if (typeof N?.ensureImageUrl == "function") {
          const url = await N.ensureImageUrl(Q.id);
          if (url) Q.image_url = url;
        }
      } catch {
      }
      return Q;
    }, warmVisibleImages = (items, idx) => {
      try {
        const VC = globalThis.__INLAY_VIEWER_CORE__, N = globalThis.__INLAY_NATIVE__;
        const ids = VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(items, idx, 1, Math.max(8, (items || []).length || 0)) : (items || []).slice(Math.max(0, idx - 3), idx + 5).map((c) => c?.id).filter(Boolean);
        const gen = d._metaGen || 0;
        const done = () => {
          if (gen !== (d._metaGen || 0) || t.uiOpen || d.minimized) return;
          // Fill srcs in place — avoid full strip rebuild (separator flicker).
          fillThumbSrcs(items, d.index).catch(() => {
          });
        };
        if (typeof N?.warmImages == "function") N.warmImages(ids).then(done).catch(() => {
        });
        else if (typeof N?.ensureImageUrl == "function") Promise.all(ids.map((id) => N.ensureImageUrl(id).catch(() => ""))).then(done).catch(() => {
        });
      } catch {
      }
    }, paintMainNow = async (Q) => {
      if (!Q) return !1;
      const id = String(Q.id || "");
      if (d.lastMainId === id && Ie(Q)) return !1;
      // Optimistic: paint cache/previous frame first; ensure fills in after (never blocks select/sync).
      const cached = Ie(Q);
      d.lastMainId = id;
      d._paintMainGen = (d._paintMainGen || 0) + 1;
      const gen = d._paintMainGen;
      try {
        if (cached) d._lastMainSrc = cached;
        await S.setInnerHTML(mainImgHtml(Q, cached || d._lastMainSrc || ""));
      } catch {
        return !1;
      }
      if (cached) return !0;
      ensureCardImage(Q).then(async (card) => {
        if (gen !== d._paintMainGen || d.lastMainId !== id) return;
        const src = Ie(card);
        if (!src) return;
        d._lastMainSrc = src;
        try {
          await S.setInnerHTML(mainImgHtml(card));
        } catch {
        }
      }).catch(() => {
      });
      return !0;
    }, selectGalIndex = async (idx) => {
      const items = Array.isArray(d.items) && d.items.length ? d.items : U();
      if (!items.length) {
        await T();
        return;
      }
      d.index = Math.max(0, Math.min(Number.isFinite(Number(idx)) ? Number(idx) : 0, items.length - 1));
      d.selectedCount = selectedCountOf(items);
      const card = items[d.index];
      // Trick: move outline/opacity on existing thumbs first (no strip rebuild), then swap main.
      paintThumbsQuick(d.index).catch(() => {
      });
      await paintMainNow(card);
      d._metaGen = (d._metaGen || 0) + 1;
      const gen = d._metaGen;
      warmVisibleImages(items, d.index);
      d._softTimer && clearTimeout(d._softTimer);
      d._softTimer = setTimeout(() => {
        if (gen !== d._metaGen || t.uiOpen) return;
        softAfterSelect(gen).catch(() => {
        });
      }, 90);
    }, syncToCardId = async (cardId) => {
      const id = String(cardId || "");
      if (!id || d.minimized || t.uiOpen) return !1;
      const items = Array.isArray(d.items) && d.items.length ? d.items : U();
      const idx = items.findIndex((card) => String(card?.id || "") === id);
      if (idx < 0) return !1;
      if (d.index === idx && d.lastMainId === id) return !0;
      await selectGalIndex(idx);
      return !0;
    }, thumbShellStyle = (on, split) => `width:64px;height:88px;object-fit:contain;border-radius:8px;cursor:pointer;opacity:${on ? 1 : 0.45};outline:${on ? "3px solid #a78bfa" : "1px solid rgba(255,255,255,.08)"};outline-offset:${on ? "1px" : "0"};background:#111827;flex:0 0 auto;transform:${on ? "scale(1.04)" : "none"};box-shadow:${on ? "0 0 0 1px rgba(124,108,255,.55),0 6px 16px rgba(0,0,0,.45)" : "none"};${split ? "margin-left:4px;" : ""}`, refreshThumbsRect = async () => {
      try {
        d._thumbsRect = await E.getBoundingClientRect(), d._thumbsRectAt = Date.now();
      } catch {
        d._thumbsRect = null;
      }
    }, paintThumbsChrome = async (items, idx) => {
      const list = items || [];
      d.selectedCount = selectedCountOf(list);
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const splitAt = typeof VC?.galleryStripSplitAt == "function" ? VC.galleryStripSplitAt(d.selectedCount || 0, list.length) : (d.selectedCount > 0 && d.selectedCount < list.length ? d.selectedCount : 0);
      const thumbBits = [];
      for (let ut = 0; ut < list.length; ut += 1) {
        if (splitAt > 0 && ut === splitAt) {
          thumbBits.push('<div data-nx-split="1" style="flex:0 0 auto;width:16px;height:88px;display:flex;align-items:center;justify-content:center;color:rgba(232,238,248,.55);font:700 15px/1 Consolas,monospace;user-select:none;pointer-events:none;letter-spacing:-1px;">|</div>');
        }
        const Le = list[ut], on = ut === idx, split = splitAt > 0 && ut === splitAt, src = Ie(Le) || THUMB_PLACEHOLDER;
        thumbBits.push(`<img data-gal-idx="${ut}" src="${src}" style="${thumbShellStyle(on, split)}" loading="lazy" decoding="async" />`);
      }
      await E.setInnerHTML(thumbBits.join(""));
      await refreshThumbsRect();
    }, paintThumbsQuick = async (idx) => {
      // Style-only selection move: keep existing <img> nodes + `|` separator, just retarget outline/opacity.
      try {
        const items = Array.isArray(d.items) && d.items.length ? d.items : U();
        const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await E.getChildren()) : [];
        if (!kids?.length) {
          await paintThumbsChrome(items, idx);
          return;
        }
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const splitAt = typeof VC?.galleryStripSplitAt == "function" ? VC.galleryStripSplitAt(d.selectedCount || selectedCountOf(items) || 0, items.length) : (d.selectedCount > 0 && d.selectedCount < items.length ? d.selectedCount : 0);
        let touched = 0;
        for (let W = 0; W < kids.length; W += 1) {
          const el = kids[W];
          if (!el) continue;
          let galIdx = -1;
          try {
            if (typeof el.getAttribute == "function") {
              const split = await el.getAttribute("data-nx-split");
              if (split != null && split !== "") continue;
              const raw = await el.getAttribute("data-gal-idx");
              if (raw != null && raw !== "" && Number.isFinite(Number(raw))) galIdx = Number(raw);
              else if (typeof VC?.galleryIndexFromChildIndex == "function") galIdx = VC.galleryIndexFromChildIndex(W, splitAt || d.selectedCount || 0, items.length);
              else galIdx = W;
            }
          } catch {
            continue;
          }
          if (galIdx < 0 || galIdx >= items.length) continue;
          const on = galIdx === idx, split = splitAt > 0 && galIdx === splitAt, style = thumbShellStyle(on, split);
          try {
            if (typeof el.setStyleAttribute == "function") await el.setStyleAttribute(style);
            else if (typeof el.setAttribute == "function") await el.setAttribute("style", style);
          } catch {
          }
          touched += 1;
        }
        if (touched < Math.min(items.length, 1)) await paintThumbsChrome(items, idx);
      } catch {
        await paintThumbsChrome(Array.isArray(d.items) && d.items.length ? d.items : U(), idx);
      }
    }, softAfterSelect = async (gen) => {
      if (gen !== (d._metaGen || 0) || d.minimized) return;
      const items = Array.isArray(d.items) && d.items.length ? d.items : U(), Q = items[d.index];
      if (!Q) return;
      // Background: warm srcs in place. Do NOT rewrite strip HTML (flickers `|` and feels laggy).
      try {
        await fillThumbSrcs(items, d.index);
        if (gen !== (d._metaGen || 0)) return;
        await paintThumbsQuick(d.index);
      } catch {
        if (gen !== (d._metaGen || 0)) return;
        await paintThumbsStrip(items, d.index);
      }
      if (gen !== (d._metaGen || 0)) return;
      // Rebuild when card changes OR hit-test zones were lost (stale/racy bind).
      if ((d._metaCardId || "") !== String(Q.id || "") || !(d.metaHits || []).length) {
        await buildMetaUi(Q, gen);
        if (gen === (d._metaGen || 0)) d._metaCardId = String(Q.id || "");
      }
      if (gen !== (d._metaGen || 0)) return;
      await paintStatus();
    }, THUMB_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", fillThumbSrcs = async (items, idx) => {
      try {
        const list = items || [];
        const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await E.getChildren()) : [];
        if (!kids?.length) return;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const warmIds = new Set(VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(list, idx, 1, Math.max(8, list.length || 0)) : list.slice(Math.max(0, idx - 3), idx + 5).map((c) => String(c?.id || "")).filter(Boolean));
        for (const id of warmIds) {
          const card = list.find((c) => String(c?.id || "") === id);
          if (card) await ensureCardImage(card);
        }
        for (const el of kids) {
          if (!el || typeof el.getAttribute != "function") continue;
          let galIdx = null;
          try {
            const split = await el.getAttribute("data-nx-split");
            if (split != null && split !== "") continue;
            const raw = await el.getAttribute("data-gal-idx");
            if (raw != null && raw !== "") galIdx = Number(raw);
          } catch {
            continue;
          }
          if (!Number.isFinite(galIdx)) continue;
          const card = list[galIdx], id = String(card?.id || "");
          if (!warmIds.has(id)) continue;
          const src = Ie(card);
          if (!src || typeof el.setAttribute != "function") continue;
          try {
            await el.setAttribute("src", src);
          } catch {
          }
        }
      } catch {
      }
    }, paintThumbsStrip = async (items, idx) => {
      const list = items || [];
      d.selectedCount = selectedCountOf(list);
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const splitAt = typeof VC?.galleryStripSplitAt == "function" ? VC.galleryStripSplitAt(d.selectedCount || 0, list.length) : (d.selectedCount > 0 && d.selectedCount < list.length ? d.selectedCount : 0);
      const warmIds = new Set(VC?.visibleGalleryImageIds ? VC.visibleGalleryImageIds(list, idx, 1, Math.max(8, list.length || 0)) : list.slice(Math.max(0, idx - 3), idx + 5).map((c) => String(c?.id || "")).filter(Boolean));
      for (const id of warmIds) {
        const card = list.find((c) => String(c?.id || "") === id);
        if (card) await ensureCardImage(card);
      }
      const thumbBits = [];
      for (let ut = 0; ut < list.length; ut += 1) {
        if (splitAt > 0 && ut === splitAt) {
          thumbBits.push('<div data-nx-split="1" style="flex:0 0 auto;width:16px;height:88px;display:flex;align-items:center;justify-content:center;color:rgba(232,238,248,.55);font:700 15px/1 Consolas,monospace;user-select:none;pointer-events:none;letter-spacing:-1px;">|</div>');
        }
        const Le = list[ut], id = String(Le?.id || ""), on = ut === idx, split = splitAt > 0 && ut === splitAt, shell = thumbShellStyle(on, split), src = warmIds.has(id) ? Ie(Le) : "";
        thumbBits.push(`<img data-gal-idx="${ut}" src="${src || THUMB_PLACEHOLDER}" style="${shell}" loading="lazy" decoding="async" />`);
      }
      await E.setInnerHTML(thumbBits.join(""));
      await refreshThumbsRect();
    }, hitThumbAt = async (x, y) => {
      // Geometry hit-test — SafeDOM getBoundingClientRect on setInnerHTML <img> drifts past `|`.
      const items = Array.isArray(d.items) && d.items.length ? d.items : U();
      if (!items.length) return -1;
      try {
        await refreshThumbsRect();
        const strip = d._thumbsRect;
        if (!strip || x < strip.left || x > strip.right || y < strip.top || y > strip.bottom) return -1;
        const VC = globalThis.__INLAY_VIEWER_CORE__;
        const scrollLeft = await getScrollLeftSafe(E);
        const localX = x - strip.left + scrollLeft;
        if (typeof VC?.thumbIndexAtStripX == "function") {
          return VC.thumbIndexAtStripX(localX, {
            count: items.length,
            selectedCount: d.selectedCount || selectedCountOf(items) || 0
          });
        }
      } catch {
      }
      return -1;
    }, T = async (mode = "full") => {
      if (t.uiOpen) return;
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const paintMode = VC?.mergeViewerPaintJob ? VC.mergeViewerPaintJob(null, mode || "full") : mode || "full";
      if (paintMode === "chrome") {
        await paintStatus(), await I();
        return;
      }
      const A = Array.isArray(d.items) ? d.items.length : 0, prevItems = Array.isArray(d.items) ? d.items : [], _ = U();
      const VC2 = globalThis.__INLAY_VIEWER_CORE__;
      const prevIds = prevItems.map((c) => String(c?.id || "")).filter(Boolean);
      const nextIds = _.map((c) => String(c?.id || "")).filter(Boolean);
      const idsSame = VC2?.shouldRefreshGallery ? !VC2.shouldRefreshGallery(prevIds, nextIds) : prevIds.join("|") === nextIds.join("|");
      const nextSelectedCount = selectedCountOf(_);
      // Same strip (e.g. scrolled onto a no-image message while keeping last imaged focus) → skip rebuild.
      if (paintMode !== "full" && idsSame && A > 0 && _.length === A && (d.selectedCount || 0) === nextSelectedCount) {
        d.items = _;
        d.selectedCount = nextSelectedCount;
        await paintStatus(), await I();
        return;
      }
      // Invalidate any in-flight meta/thumb paint so old base/char chips cannot append after the new set.
      d._metaGen = (d._metaGen || 0) + 1;
      const gen = d._metaGen;
      d.items = _;
      const O = t.selectedMessage, G = !!(O?.hash && t.jobsInFlight.has(O.hash)), B = t.jobProgress, busy = !!(G || B);
      if (d.minimized) {
        await paintStatus(), await I();
        return;
      }
      if (!_.length) {
        // Keep last strip while generating — transient empty gallery lookups looked like a disconnect.
        if (busy && Array.isArray(prevItems) && prevItems.length) {
          d.items = prevItems;
          await paintStatus(), await I();
          if (paintMode !== "chrome") {
            try {
              await paintMainNow(prevItems[Math.max(0, Math.min(d.index, prevItems.length - 1))]);
              await paintThumbsStrip(prevItems, d.index);
            } catch {
            }
          }
          return;
        }
        d.lastMainId = "";
        const Le = busy ? `<span style="color:#8b97ab;font-size:12px">생성 중… 상태표시줄을 확인하세요</span>` : `<span style="color:#778398;font-size:12px">${O ? "연결된 이미지 없음" : "메시지를 선택하면 여기에 표시됩니다"}</span>`;
        await S.setInnerHTML(Le), await E.setInnerHTML(""), d.metaHits = [], d._metaCardId = "", await j.setInnerHTML(""), await paintStatus(), await g();
        return;
      }
      !A && _.length ? d.index = Math.max(0, _.length - 1) : d.index = Math.max(0, Math.min(d.index, _.length - 1)), _.length > A && d.index === Math.max(0, A - 1) && (d.index = _.length - 1);
      const Q = _[d.index];
      d.selectedCount = selectedCountOf(_);
      warmVisibleImages(_, d.index);
      await paintMainNow(Q);
      if (gen !== (d._metaGen || 0)) return;
      // Image stage height is locked to geo — do not reflow on message change.
      await paintThumbsStrip(_, d.index);
      if (gen !== (d._metaGen || 0)) return;
      // Rebuild when card changes OR hit zones missing (race left chips with empty metaHits).
      if (paintMode === "full" || (d._metaCardId || "") !== String(Q.id || "") || !(d.metaHits || []).length) {
        await buildMetaUi(Q, gen);
        if (gen === (d._metaGen || 0)) d._metaCardId = String(Q.id || "");
      }
      if (gen !== (d._metaGen || 0)) return;
      // Do NOT rebuild the preset <select> on every paint — that snaps the
      // user's in-progress choice back to whatever card settings still holds.
      await paintStatus(), await I();
    }, runMetaChip = async (chip, charI = -1, card = null) => {
      const target = card || U()[d.index];
      if (!target) return;
      const kind = String(chip || "");
      if (kind === "base") {
        await openCardTagEdit(target);
        return;
      }
      if (!/^char\d+/i.test(kind) && kind !== "char") return;
      await ensureViewerRosterLoaded().catch(() => null);
      const idx = Number.isFinite(Number(charI)) ? Number(charI) : Number(String(kind).replace(/^char/i, "")) - 1;
      const cast = R(target), entry = cast.find((row) => Number(row.index) === idx) || cast[idx];
      if (entry?.name) {
        entry.roster = Dt(entry.name) || entry.roster;
        await Ua(entry);
        return;
      }
      const raw = Array.isArray(target.characters) ? target.characters[idx] : null, name = w(raw?.name || "", 200);
      if (name) await Ua({
        name,
        prompt: w(raw?.prompt || "", 400),
        roster: Dt(name),
        index: idx
      });
      else await openCardTagEdit(target);
    }, hitMetaChipAt = async (x, y) => {
      let zones = d.metaHits || [];
      for (const zone of zones) {
        if (!zone?.el) continue;
        try {
          if (await X(zone.el, x, y)) return zone;
        } catch {
        }
      }
      // Live children fallback (SafeDOM sometimes drops stale wrappers).
      try {
        const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await j.getChildren()) : [];
        for (const el of kids || []) {
          if (!el || typeof el.getAttribute != "function") continue;
          let chip = "";
          try {
            if (!(await X(el, x, y))) continue;
            chip = String(await el.getAttribute("data-nx-chip") || "");
          } catch {
            continue;
          }
          if (!chip || chip === "y") continue;
          let charI = -1;
          if (/^char\d+/i.test(chip)) {
            charI = Number(String(chip).replace(/^char/i, "")) - 1;
            try {
              const raw = await el.getAttribute("data-nx-char-i");
              if (raw != null && raw !== "" && Number.isFinite(Number(raw))) charI = Number(raw);
            } catch {
            }
          }
          return {
            el,
            kind: "chip",
            chip,
            charI
          };
        }
      } catch {
      }
      return null;
    }, buildMetaUi = async (Q, genIn = null) => {
      const gen = genIn != null ? genIn : d._metaGen || 0;
      d.metaHits = [];
      if (!Q) {
        if (gen !== (d._metaGen || 0)) return;
        try {
          await j.setInnerHTML("");
        } catch {
        }
        return;
      }
      try {
        if (!(t._viewerRoster?.rosterSessionId) || t.backendSettings?.card?.unified_chat_priority) await ensureViewerRosterLoaded();
      } catch {
      }
      const chipStyle = (on, accent) => `cursor:pointer;pointer-events:auto;display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:11px;line-height:1.2;white-space:nowrap;border:1px solid ${accent || (on ? "rgba(255,255,255,.14)" : "rgba(248,113,113,.45)")};background:${accent ? "rgba(124,108,255,.18)" : on ? "rgba(255,255,255,.06)" : "rgba(248,113,113,.12)"};color:${on ? "#e8eef8" : "#fecaca"};opacity:${on ? 1 : 0.72}`, Yt = Array.isArray(Q.characters) ? Q.characters : [], cast = R(Q);
      d.castEntries = cast.map((entry) => ({
        ...entry,
        el: null
      }));
      if (gen !== (d._metaGen || 0)) return;
      // Clear first, then createElement chips (same reliable path as sticky inspect).
      // setInnerHTML chip spans lose click hit-testing under SafeDOM.
      try {
        await j.setInnerHTML("");
      } catch {
        return;
      }
      if (gen !== (d._metaGen || 0)) return;
      const addChip = async (label, chip, style, charI = -1) => {
        if (gen !== (d._metaGen || 0)) return null;
        const el = await H(e, "span", {
          text: label,
          style
        });
        try {
          await el.setAttribute("data-nx-chip", chip);
          if (charI >= 0) await el.setAttribute("data-nx-char-i", String(charI));
        } catch {
        }
        if (gen !== (d._metaGen || 0)) return null;
        await j.appendChild(el);
        if (chip && chip !== "y") {
          const action = {
            el,
            kind: "chip",
            chip
          };
          if (charI >= 0) action.charI = charI;
          d.metaHits.push(action);
        }
        return el;
      };
      {
        const yRaw = Q.y_percent ?? Q.anchor_percent ?? Q.read_percent, yNum = Number(yRaw);
        if (Number.isFinite(yNum)) {
          await addChip(`${Math.round(Math.max(0, Math.min(100, yNum)))}%`, "y", "padding:4px 8px;border-radius:999px;font-size:11px;line-height:1.2;border:1px solid rgba(255,255,255,.12);background:rgba(15,23,42,.72);color:#94a3b8;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap;pointer-events:none");
        }
      }
      await addChip("base", "base", chipStyle(!0, "rgba(124,108,255,.45)"));
      for (let ut = 0; ut < Yt.length; ut += 1) {
        if (gen !== (d._metaGen || 0)) return;
        const Le = Yt[ut], roster = Dt(Le?.name || ""), on = !roster || roster.scope !== "__global__" || isGlobalEnabledForCharacter(roster), label = `c${ut + 1}${Le?.name ? `·${Le.name}` : ""}`;
        await addChip(label, `char${ut + 1}`, chipStyle(on), ut);
      }
    }, v = async (opts = {}) => {
      if (d.minimized) return;
      try {
        const A = await r.getBoundingClientRect();
        if (!(A.width > 40 && A.height > 40)) return;
        // Position from on-screen rect; size only when user actually resized (syncSize).
        d.geo.left = A.left, d.geo.top = A.top;
        if (opts.syncSize) {
          d.geo.w = Math.max(260, A.width), d.geo.h = Math.max(280, A.height), d.expandedH = d.geo.h;
        }
        d.geo = clampViewerGeo(d.geo, !1);
      } catch {
      }
    };
    d.renderGal = T, d.paintStatus = paintStatus;
    if (!t._onWarmProgressInstalled) {
      t._onWarmProgressInstalled = !0;
      try {
        const N = globalThis.__INLAY_NATIVE__;
        if (typeof N?.onWarmProgress == "function") {
          N.onWarmProgress(() => {
            try {
              if (t.uiOpen && t.uiTab === "explorer") paintExplorerSelectionUi();
            } catch {
            }
            if (t.uiOpen || t._indexPaintQueued) return;
            t._indexPaintQueued = !0;
            Promise.resolve().then(() => {
              t._indexPaintQueued = !1;
              if (t.galleryUi?.paintStatus) t.galleryUi.paintStatus().catch(() => {
              });
            });
          });
        }
      } catch {
      }
    }
    d.selectGalIndex = selectGalIndex, d.syncToCardId = syncToCardId, d.setOpen = async () => {
      await T();
    };
    d._spinTimer && clearInterval(d._spinTimer), d._spinTimer = setInterval(() => {
      const B = t.jobProgress;
      if (!B || d.minimized) return;
      const stt = String(B.state || "");
      if (stt === "done" || stt === "error") return;
      paintStatus().catch(() => {
      });
    }, 180);
    const X = hitEl, messageBusy = (hash) => {
      const h0 = String(hash || "");
      if (h0 && t.jobsInFlight.has(h0)) return !0;
      return !!(t.jobProgress && formatViewerJob(t.jobProgress)?.busy && t.selectedMessage?.hash && t.selectedMessage.hash === h0);
    }, te = async () => {
      const A = t.selectedMessage;
      if (!A?.text) {
        y("warn", "regen.tag.skip", "선택된 메시지 없음"), await C.setTextContent("태그 재생성: 먼저 메시지를 클릭하세요");
        return;
      }
      if (messageBusy(A.hash)) {
        await C.setTextContent("이미 작업 중… 끝날 때까지 기다려 주세요");
        return;
      }
      try {
        await C.setTextContent("태그 재생성 중…"), await Be(await Z({
          useOverride: !1
        }), A.text, !0), y("info", "regen.tag", A.hash.slice(0, 8));
      } catch (_) {
        y("error", "regen.tag.fail", _?.message || _), await C.setTextContent(`태그 재생성 실패: ${z(_?.message || _, 80)}`);
      }
    }, rerollImage = async () => {
      const A = U()[d.index], _ = d.index, O = Number(A?.paragraph), G = Number(A?.shot_index);
      if (!A?.id) {
        y("warn", "regen.image.skip", "현재 이미지 없음"), await C.setTextContent("리롤: 먼저 이미지를 선택하세요");
        return;
      }
      if (messageBusy(t.selectedMessage?.hash || A.content_hash)) {
        await C.setTextContent("이미 작업 중… 끝날 때까지 기다려 주세요");
        return;
      }
      try {
        await C.setTextContent("이미지 리롤 중…");
        const B = await withImageRerollToast(`P${Number.isFinite(O) ? O : "?"} 이미지 리롤 중…`, async () => await K(`/v1/cards/${encodeURIComponent(A.id)}/reroll`, {
          method: "POST",
          body: {
            mode: "nai"
          }
        }, 18e4));
        if (B?.busy || B?.error?.code === "busy") {
          await C.setTextContent(B?.error?.message || "이미 작업 중… 끝날 때까지 기다려 주세요");
          return;
        }
        const W = await Z({
          useOverride: !1
        }).catch(() => null);
        W?.sessionId && await ce(W.sessionId);
        try {
          await he();
        } catch {
        }
        const J = U(), Q = String(B?.card?.id || ""), me = Q ? J.findIndex((nn) => nn.id === Q) : -1, nn = me >= 0 ? me : J.findIndex((Yt) => Number(Yt.paragraph) === O && Number(Yt.shot_index) === G);
        d.index = nn >= 0 ? nn : Math.max(0, Math.min(_, Math.max(0, J.length - 1))), await T(), await C.setTextContent(`이미지 리롤 완료 · ${String(B?.card?.id || A.id).slice(0, 8)}`), y("info", "regen.image", `P${O} ${String(A.id).slice(0, 8)}→${String(B?.card?.id || "").slice(0, 8)}`);
      } catch (B) {
        y("error", "regen.image.fail", B?.message || B), await C.setTextContent(`리롤 실패: ${z(B?.message || B, 80)}`);
      }
    }, rerollAllImages = async () => {
      const A = t.selectedMessage, targets0 = messageCardsByY(A);
      if (!A || !targets0.length) {
        y("warn", "regen.all.skip", "재생성할 이미지 없음"), await C.setTextContent("재생성: 이미지가 있는 메시지를 선택하세요");
        return;
      }
      if (messageBusy(A.hash)) {
        await C.setTextContent("이미 작업 중… 끝날 때까지 기다려 주세요");
        return;
      }
      const hash = A.hash || "";
      if (hash) t.jobsInFlight.set(hash, Date.now());
      try {
        await C.setTextContent(`전체 ${targets0.length}장 재생성 중…`);
        const scope = await Z({ useOverride: !1 }).catch(() => null);
        const B = await withImageRerollToast(`전체 ${targets0.length}장 재생성 중…`, async (report) => rerollMessageImagesLive(A, {
          scope,
          report,
          onShot: async (i) => {
            d.index = i;
            await T();
            await C.setTextContent(`${i + 1}/${targets0.length} 교체 완료`);
          }
        }), { shotCount: targets0.length });
        scope?.sessionId && await ce(scope.sessionId, !0);
        try {
          await he();
        } catch {
        }
        const failCount = Array.isArray(B?.failed) ? B.failed.length : 0;
        d.index = 0, await T(), await C.setTextContent(failCount ? `전체 재생성 부분 실패 · 성공 ${Number(B?.count || 0)} / 실패 ${failCount}` : `전체 재생성 완료 · ${Number(B?.count || 0)}장`), y("info", "regen.all", `count=${B?.count || 0} failed=${failCount} hash=${String(A.hash || "").slice(0, 8)}`);
      } catch (B) {
        y("error", "regen.all.fail", B?.message || B), await C.setTextContent(`전체 재생성 실패: ${z(B?.message || B, 80)}`);
      } finally {
        if (hash) t.jobsInFlight.delete(hash);
      }
    }, syncViewerPresetSelect = async () => {
      if (!d.presetSelect || t._presetSwitching) return;
      const card = kt(t.backendSettings?.card || {}), presets = Array.isArray(card.presets) ? card.presets : [], activeId = resolveActivePresetId(card), active = presets.find((p) => presetIdEq(p.id, activeId));
      d.viewerPresetIds = presets.map((p) => String(p.id || ""));
      const label = `${String(active?.name || (presets.length ? "프리셋" : "없음")).slice(0, 12)}${String(active?.name || "").length > 12 ? "…" : ""} ▾`;
      try {
        typeof d.presetSelect.setTextContent == "function" ? await d.presetSelect.setTextContent(label) : await d.presetSelect.setInnerHTML(h(label));
      } catch {
      }
      if (d.presetMenu && typeof d.presetMenu.setInnerHTML == "function") {
        const menuHtml = presets.length ? presets.map((p) => {
          const on = presetIdEq(p.id, activeId);
          return `<div style="padding:7px 10px;cursor:pointer;font-size:11px;line-height:1.3;color:${on ? "#e8eef8" : "#a6b1c2"};background:${on ? "rgba(124,108,255,.22)" : "transparent"};border-bottom:1px solid rgba(255,255,255,.06)">${h(p.name || p.id)}</div>`;
        }).join("") : '<div style="padding:8px 10px;font-size:11px;color:#778398">프리셋 없음</div>';
        try {
          await d.presetMenu.setInnerHTML(menuHtml);
        } catch {
        }
      }
      const presetChromeLive = !d.minimized || viewerMinimizeMode() === "toolbar";
      try {
        await d.presetMenu?.setStyleAttribute?.(`display:${d.presetMenuOpen && presetChromeLive ? "block" : "none"};position:absolute;top:34px;left:10px;min-width:140px;max-width:220px;max-height:220px;overflow:auto;z-index:20;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:#0b0f18;box-shadow:0 10px 28px rgba(0,0,0,.45);pointer-events:auto;`);
      } catch {
      }
      // Panel clips absolute children when overflow:hidden — open the gate while menu shows.
      try {
        const base = Ft(d.geo, d.minimized);
        await r.setStyleAttribute(d.presetMenuOpen && presetChromeLive ? base.replace(/overflow:[^;]+/i, "overflow:visible") : base);
      } catch {
      }
    }, pickViewerPreset = async (selected) => {
      if (!selected || t._presetSwitching) return;
      try {
        const card = kt(t.backendSettings?.card || {});
        if (!Array.isArray(card.presets) || !card.presets.some((p) => presetIdEq(p.id, selected))) return;
        d.presetMenuOpen = !1;
        if (presetIdEq(card.active_preset_id, selected) && presetIdEq(t.activePresetId || card.active_preset_id, selected)) {
          await syncViewerPresetSelect();
          await C.setTextContent(`프리셋 · ${card.presets.find((p) => presetIdEq(p.id, selected))?.name || selected}`);
          return;
        }
        const saved = await applyActivePreset(selected, { showCardTab: !!t.uiOpen });
        const active = saved?.presets?.find((p) => presetIdEq(p.id, selected));
        await syncViewerPresetSelect();
        await C.setTextContent(`프리셋 적용 · ${active?.name || selected}`);
        y("info", "viewer.preset", selected);
      } catch (err) {
        y("warn", "viewer.preset.fail", err?.message || err);
      }
    }, ae = async () => {
      const A = t.backendSettings?.card || {}, _ = A.overlay_markers === !1;
      await flushSettingsSave(), await pe({ card: {
        ...A,
        overlay_markers: _,
        inline_previews: _
      } }), y("info", "overlay.toggle", String(_)), await he(), await T();
    }, Za = async (A) => {
      if (!d.drag) return;
      const cx = Number(A?.clientX), cy = Number(A?.clientY);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
      const _ = cx - d.drag.startCX, O = cy - d.drag.startCY;
      !d.drag.moved && Math.abs(_) + Math.abs(O) > 4 && (d.drag.moved = !0);
      if (d.drag.moved) try {
        A.preventDefault?.();
      } catch {
      }
      d.geo.left = d.drag.originX + _, d.geo.top = d.drag.originY + O, d.geo = clampViewerGeo(d.geo, d.minimized);
      const G = Date.now();
      if (G - (d.drag.lastApply || 0) < 16) return;
      d.drag.lastApply = G, await f();
    }, endViewerDrag = async (opts = {}) => {
      if (!d.drag) return;
      const { moveId: A, upId: _, cancelId: cancelId, moved: moved, expandOnTap: expandOnTap } = d.drag;
      d.drag = null;
      try {
        A != null && await e.removeEventListener(A);
      } catch {
      }
      try {
        _ != null && await e.removeEventListener(_);
      } catch {
      }
      try {
        cancelId != null && await e.removeEventListener(cancelId);
      } catch {
      }
      if (opts.cancelled) {
        if (moved) await x();
        await refreshThumbsRect();
        return;
      }
      if (!moved && expandOnTap && d.minimized) {
        await toggleMinimizeBtn();
        await refreshThumbsRect();
        return;
      }
      await x();
      await refreshThumbsRect();
    }, en = async () => {
      await endViewerDrag({});
    }, onViewerDragCancel = async () => {
      await endViewerDrag({ cancelled: !0 });
    }, startViewerDrag = async (A, _, O, expandOnTap) => {
      if (!expandOnTap) await v();
      const B = await e.addEventListener("pointermove", Za), W = await e.addEventListener("pointerup", en), cancelId = await e.addEventListener("pointercancel", onViewerDragCancel);
      d.drag = {
        startCX: _,
        startCY: O,
        originX: d.geo.left,
        originY: d.geo.top,
        moved: !1,
        expandOnTap: !!expandOnTap,
        moveId: B,
        upId: W,
        cancelId,
        lastApply: 0
      };
    }, tn = async (A) => {
      if (t.uiOpen || t._hostChromeBlocked || t.charEditUi || t._viewerHiddenForModal) return;
      // Ignore non-primary buttons (middle-click message jump removed — never reliable on SafeDOM).
      if (Number(A?.button) != null && Number(A.button) !== 0) return;
      const _ = A.clientX, O = A.clientY;
      if (!await X(r, _, O)) return;
      // Icon minimize is its own chrome (tap/drag to move/expand).
      // Toolbar minimize is the SAME header — just hide the body — so keep normal button/preset hit-tests.
      if (d.minimized && viewerMinimizeMode() === "icon") {
        await startViewerDrag(A, _, O, !0);
        return;
      }
      let G = !1;
      try {
        const B = await r.getBoundingClientRect();
        _ > B.right - 22 && O > B.bottom - 22 && (G = !0);
      } catch {
      }
      if (!G) {
        if (await X(c, _, O)) {
          try {
            const B = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await c.getChildren()) : [];
            for (let W = 0; W < B.length; W += 1) {
              const J = await B[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                W === 0 ? await selectGalIndex(d.index - 1) : W === 1 ? await selectGalIndex(d.index + 1) : W === 2 ? await te() : W === 3 ? await rerollAllImages() : W === 4 ? await ae() : W === 5 ? (t.backendSettings?.card || {}).show_risu_settings_button !== !1 && await At() : W === 6 && await toggleMinimizeBtn();
                return;
              }
            }
          } catch {
          }
          return;
        }
        // Preset dropdown (SafeDOM forbids change/input — drive via pointer hit-test).
        if (d.presetMenuOpen && d.presetMenu && await X(d.presetMenu, _, O)) {
          try {
            const kids = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(await d.presetMenu.getChildren()) : [];
            for (let W = 0; W < kids.length; W += 1) {
              const J = await kids[W].getBoundingClientRect();
              if (_ >= J.left && _ <= J.right && O >= J.top && O <= J.bottom) {
                const id = d.viewerPresetIds?.[W] || "";
                id && await pickViewerPreset(id);
                return;
              }
            }
          } catch {
          }
          return;
        }
        if (d.presetSelect && await X(d.presetSelect, _, O)) {
          d.presetMenuOpen = !d.presetMenuOpen;
          await syncViewerPresetSelect();
          return;
        }
        if (d.presetMenuOpen) {
          d.presetMenuOpen = !1;
          try {
            await syncViewerPresetSelect();
          } catch {
          }
        }
        if (await X(i, _, O)) {
          await startViewerDrag(A, _, O, !1);
          return;
        }
        // Meta chips BEFORE thumbs — SafeDOM thumb rects can overlap the chip row.
        if (await X(j, _, O)) {
          try {
            const zone = await hitMetaChipAt(_, O);
            if (zone?.chip) {
              await runMetaChip(zone.chip, zone.charI, U()[d.index]);
              return;
            }
            // Clicked chip row but missed a zone (stale) — rebuild once and retry.
            const card = U()[d.index];
            if (card && !(d.metaHits || []).length) {
              await buildMetaUi(card, d._metaGen || 0);
              const again = await hitMetaChipAt(_, O);
              if (again?.chip) {
                await runMetaChip(again.chip, again.charI, card);
                return;
              }
            }
          } catch (err) {
            y("error", "viewer.chip.fail", err?.message || err);
          }
          return;
        }
        {
          const galIdx = await hitThumbAt(_, O);
          if (galIdx >= 0) {
            await selectGalIndex(galIdx);
            return;
          }
        }
        if (await X(S, _, O)) {
          try {
            const B = await S.getBoundingClientRect();
            if (B && _ >= B.right - 78 && _ <= B.right - 4 && O >= B.top + 4 && O <= B.top + 40) {
              await rerollImage();
              return;
            }
          } catch {
          }
        }
      }
    }, an = async (A) => {
      if (d.drag || t.uiOpen || t._hostChromeBlocked) return;
      const _ = A.clientX, O = A.clientY;
      let nearResize = !1;
      try {
        const B = await r.getBoundingClientRect();
        if (B && typeof _ == "number" && typeof O == "number") nearResize = _ >= B.right - 28 && O >= B.bottom - 28;
      } catch {
        return;
      }
      if (!nearResize) return;
      const G = {
        w: d.geo.w,
        h: d.geo.h
      };
      await v({
        syncSize: !0
      }), (Math.abs(G.w - d.geo.w) > 1 || Math.abs(G.h - d.geo.h) > 1) && (await qt(d.geo), await f());
    };
    d.pointerId = await D("galPtr", () => e.addEventListener("pointerdown", tn), null), d.pointerUpId = await D("galPtrUp", () => e.addEventListener("pointerup", an), null);
    d.dblId = null;
    d.previewDblId = null;
    d.syncViewerPresetSelect = syncViewerPresetSelect;
    d.presetChangeId = null;
    d.presetInputId = null;
    await syncViewerPresetSelect();
    d._onWinResize = () => {
      if (t.galleryUi !== d || t._viewerHiddenForModal) return;
      d.geo = clampViewerGeo(d.geo, d.minimized);
      (async () => {
        try {
          typeof d.applyChrome == "function" ? await d.applyChrome() : await f();
        } catch {
        }
      })();
    };
    if (typeof window < "u") try {
      window.addEventListener("resize", d._onWinResize), d._winResizeBound = !0;
    } catch {
      d._winResizeBound = !1;
    }
    // Viewer DOM lives on the HOST document (getRootDocument). Plugin `window.wheel`
    // never sees those events — bind host doc + host defaultView, keep overflow-x:auto
    // so native wheel / middle-drag autoscroll can move the strip.
    d._thumbsRect = null;
    d._thumbsRectAt = 0;
    d._thumbWheelTargets = [];
    d._thumbWheel = (ev) => {
      if (t.uiOpen || t._hostChromeBlocked || d.minimized || d.drag) return;
      const x = ev?.clientX, y = ev?.clientY;
      if (typeof x != "number" || typeof y != "number") return;
      const dx = Number(ev.deltaX) || 0, dy = Number(ev.deltaY) || 0, delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (!delta) return;
      const rect = d._thumbsRect;
      // Fast sync reject when we have a fresh rect; otherwise refresh async and nudge.
      if (rect && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)) return;
      (async () => {
        await refreshThumbsRect();
        const live = d._thumbsRect;
        if (!live || x < live.left || x > live.right || y < live.top || y > live.bottom) return;
        const before = await getScrollLeftSafe(E);
        const ok = await setScrollLeftSafe(E, before + delta);
        const after = await getScrollLeftSafe(E);
        if (ok && Math.abs(after - before) >= 0.5) {
          try {
            ev.preventDefault?.(), ev.stopPropagation?.();
          } catch {
          }
          return;
        }
        // Native overflow may still handle the event if we did not cancel it.
        // If scroll is stuck at an edge, step the selected thumbnail.
        if (Math.abs(after - before) < 0.5) await selectGalIndex(d.index + (delta > 0 ? 1 : -1));
      })().catch(() => {
      });
    };
    d.wheelId = null;
    try {
      d.wheelId = await e.addEventListener("wheel", d._thumbWheel, {
        capture: !0,
        passive: !1
      });
    } catch {
      try {
        d.wheelId = await e.addEventListener("wheel", d._thumbWheel, !0);
      } catch {
        d.wheelId = await fe(e, "wheel", d._thumbWheel, !0);
      }
    }
    try {
      const hostWin = e.defaultView || t.hostDoc?.defaultView || null;
      if (hostWin && typeof hostWin.addEventListener == "function") {
        hostWin.addEventListener("wheel", d._thumbWheel, {
          capture: !0,
          passive: !1
        }), d._thumbWheelTargets.push(hostWin);
      }
    } catch {
    }
    await applyViewerChrome(), await T();
    try {
      d._thumbsRect = await E.getBoundingClientRect(), d._thumbsRectAt = Date.now();
    } catch {
    }
  }
  async function ct() {
    t.debugUiTimer && (clearInterval(t.debugUiTimer), t.debugUiTimer = null), t.debugUi?.pointerId != null && t.debugUi?.doc?.removeEventListener && await D("rmDbgPtr", () => t.debugUi.doc.removeEventListener(t.debugUi.pointerId), null), await rt(q), t.debugUi = null;
  }
  async function Ba() {
    if (t.uiOpen) return;
    const e = await ue();
    if (!e) return;
    const n = await Ee(e);
    if (!n || typeof e.createElement != "function") return;
    await ct();
    const o = await H(e, "div", {
      className: q,
      style: "position:fixed;left:0;top:0;width:0;height:0;z-index:99986;pointer-events:none;"
    });
    await n.appendChild(o);
    const a = await H(e, "div", {
      style: [
        "position:fixed",
        "right:16px",
        "bottom:24px",
        "left:auto",
        "z-index:99987",
        "min-width:44px",
        "height:36px",
        "padding:0 12px",
        "border-radius:10px",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "font:700 12px/1 Segoe UI,sans-serif",
        "cursor:pointer",
        "pointer-events:auto",
        "color:#dce7ff",
        "background:rgba(20,28,44,.92)",
        "border:1px solid rgba(163,184,216,.28)",
        "box-shadow:0 8px 20px rgba(0,0,0,.35)"
      ].join(";"),
      html: "DBG"
    });
    await o.appendChild(a);
    const panelStyle = () => [
      "position:fixed",
      "right:12px",
      "bottom:68px",
      "left:auto",
      "width:min(860px,96vw)",
      "height:min(620px,72vh)",
      "z-index:99987",
      `display:${t.debugUiOpen ? "flex" : "none"}`,
      "flex-direction:column",
      "overflow:hidden",
      "pointer-events:auto",
      "background:rgba(10,14,22,.96)",
      "border:1px solid rgba(163,184,216,.22)",
      "border-radius:14px",
      "box-shadow:0 16px 40px rgba(0,0,0,.45)",
      "color:#d7e2f4",
      "font:11px/1.35 Consolas,ui-monospace,monospace"
    ].join(";");
    const r = await H(e, "div", { style: panelStyle() });
    const i = await H(e, "div", {
      style: "flex:0 0 34px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;font-family:Segoe UI,sans-serif;font-size:12px;",
      html: '<span>Inlay Debug · DOM ↔ API</span><span style="opacity:.75">✕</span>'
    });
    const tool = await H(e, "div", {
      style: "flex:0 0 auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);font-family:Segoe UI,sans-serif;"
    });
    const btn = async (label) => H(e, "div", {
      style: "padding:4px 10px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(163,184,216,.25);cursor:pointer;font:700 11px Segoe UI,sans-serif;color:#dce7ff;",
      text: label
    });
    const syncBtn = await btn("선택 msg#로");
    const prevBtn = await btn("◀");
    const nextBtn = await btn("▶");
    const idxLabel = await H(e, "div", {
      style: "min-width:120px;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.28);font:700 11px Consolas,monospace;",
      text: "msg#-"
    });
    const hitLabel = await H(e, "div", {
      style: "flex:1;min-width:160px;padding:4px 8px;border-radius:8px;background:rgba(0,0,0,.22);font:11px Consolas,monospace;color:#9eb6d8;",
      text: "overlap: ?"
    });
    await tool.appendChild(syncBtn), await tool.appendChild(prevBtn), await tool.appendChild(idxLabel), await tool.appendChild(nextBtn), await tool.appendChild(hitLabel);
    const compare = await H(e, "div", {
      style: "flex:1;min-height:0;display:flex;gap:8px;padding:8px 10px;overflow:hidden;"
    });
    const mkCol = async (title) => {
      const col = await H(e, "div", {
        style: "flex:1;min-width:0;display:flex;flex-direction:column;border:1px solid rgba(163,184,216,.16);border-radius:10px;overflow:hidden;background:rgba(0,0,0,.22);"
      });
      const head = await H(e, "div", {
        style: "flex:0 0 auto;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.06);font:700 11px Segoe UI,sans-serif;color:#c9d8ef;",
        text: title
      });
      const body = await H(e, "div", {
        style: "flex:1;min-height:0;overflow:auto;padding:8px;white-space:pre-wrap;word-break:break-word;",
        text: "…"
      });
      return await col.appendChild(head), await col.appendChild(body), { col, head, body };
    };
    const left = await mkCol("LEFT · DOM 선택");
    const right = await mkCol("RIGHT · API message[]");
    await compare.appendChild(left.col), await compare.appendChild(right.col);
    const logEl = await H(e, "div", {
      style: "flex:0 0 120px;overflow:auto;padding:8px 10px;border-top:1px solid rgba(255,255,255,.06);white-space:pre-wrap;color:#9aa8bf;font-size:10.5px;",
      text: "log…"
    });
    await r.appendChild(i), await r.appendChild(tool), await r.appendChild(compare), await r.appendChild(logEl), await o.appendChild(r);
    const hitRect = async (el, x, y) => {
      try {
        const d = await el.getBoundingClientRect();
        return x >= d.left && x <= d.right && y >= d.top && y <= d.bottom;
      } catch {
        return !1;
      }
    };
    const c = async () => {
      const sel = t.selectedMessage;
      let msgs = [];
      try {
        msgs = (await Za())?.messages || [];
      } catch {
        msgs = [];
      }
      if (!Number.isFinite(Number(t.debugCompareIndex))) {
        t.debugCompareIndex = Number.isFinite(Number(sel?.chatIndex)) ? Number(sel.chatIndex) : 0;
      }
      if (msgs.length) {
        t.debugCompareIndex = Math.max(0, Math.min(msgs.length - 1, Math.floor(Number(t.debugCompareIndex) || 0)));
      } else {
        t.debugCompareIndex = 0;
      }
      const api = msgs[t.debugCompareIndex] || null;
      const domText = String(sel?.text || "");
      const apiText = String(api?.text || "");
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const cmp = typeof VC?.describeDomApiCompare == "function"
        ? VC.describeDomApiCompare(domText, apiText)
        : { domChars: domText.length, apiChars: apiText.length, overlap: !1, apiInDom: !1, domInApi: !1, shortExact: !1 };
      const matched = Number.isFinite(Number(sel?.chatIndex)) && Number(sel.chatIndex) === Number(t.debugCompareIndex);
      typeof idxLabel.setTextContent == "function" && await idxLabel.setTextContent(`msg#${t.debugCompareIndex} / ${Math.max(0, msgs.length - 1)} (${msgs.length}개)`);
      typeof hitLabel.setTextContent == "function" && await hitLabel.setTextContent(
        `share=${cmp.shareScore ?? 0} overlap=${cmp.overlap ? "YES" : "no"} apiInDom=${cmp.apiInDom ? "Y" : "n"} short=${cmp.shortExact ? "Y" : "n"} · view${matched ? "=selected" : "≠selected"}`
      );
      typeof left.head.setTextContent == "function" && await left.head.setTextContent(
        `LEFT · DOM 선택 · chars=${cmp.domChars} role=${sel?.role || "-"} hash=${String(sel?.hash || "").slice(0, 12)} DOM#${sel?.domIndex ?? "-"}`
      );
      typeof right.head.setTextContent == "function" && await right.head.setTextContent(
        `RIGHT · API msg#${api?.index ?? t.debugCompareIndex} · chars=${cmp.apiChars} role=${api?.role || "-"} isUser=${api?.isUser ? "Y" : "n"} isChar=${api?.isChar ? "Y" : "n"}`
      );
      typeof left.body.setTextContent == "function" && await left.body.setTextContent(
        sel
          ? `session=${sel.sessionId || "-"}\nvia=${sel.matchMethod || "-"}\npreview=${sel.preview || "-"}\n----\n${domText || "(empty)"}`
          : "선택된 DOM 메시지 없음 — 채팅 말풍선을 클릭하세요"
      );
      typeof right.body.setTextContent == "function" && await right.body.setTextContent(
        api
          ? `index=${api.index}\nrole=${api.role || "-"}\ngenInfo=${api.generationInfo ? "yes" : "no"}\n----\n${apiText || "(empty)"}`
          : msgs.length ? "(empty slot)" : "Za() message[] 비어 있음"
      );
      const status = `${Ve()}\n======== LOG ========\n${Ye(18) || "(log empty)"}`;
      typeof logEl.setTextContent == "function" && await logEl.setTextContent(status);
    };
    let l = null;
    const p = () => {
      l || (l = setTimeout(() => {
        l = null, c().catch(() => {
        });
      }, 120));
    }, m = async (S) => {
      t.debugUiOpen = !!S;
      typeof r.setStyleAttribute == "function" && await r.setStyleAttribute(panelStyle()), t.debugUiOpen && await c();
    }, b = async (S) => {
      const E = S.clientX, j = S.clientY;
      if (await hitRect(a, E, j)) {
        await m(!t.debugUiOpen);
        return;
      }
      if (!t.debugUiOpen) return;
      try {
        const d = await r.getBoundingClientRect();
        if (E >= d.right - 40 && E <= d.right && j >= d.top && j <= d.top + 34) {
          await m(!1);
          return;
        }
      } catch {
      }
      if (await hitRect(syncBtn, E, j)) {
        t.debugCompareIndex = Number.isFinite(Number(t.selectedMessage?.chatIndex)) ? Number(t.selectedMessage.chatIndex) : 0;
        await c();
        return;
      }
      if (await hitRect(prevBtn, E, j)) {
        t.debugCompareIndex = Math.max(0, (Number(t.debugCompareIndex) || 0) - 1);
        await c();
        return;
      }
      if (await hitRect(nextBtn, E, j)) {
        t.debugCompareIndex = (Number(t.debugCompareIndex) || 0) + 1;
        await c();
        return;
      }
    }, C = await D("dbgPtr", () => e.addEventListener("pointerdown", b), null);
    t.debugUi = {
      doc: e,
      root: o,
      fab: a,
      panel: r,
      bodyEl: logEl,
      pointerId: C,
      refreshSoon: p,
      setOpen: m,
      paint: c
    }, t.debugUiTimer = setInterval(() => {
      c().catch(() => {
      });
    }, 1e3), await c();
  }
    async function qe(e) {
    for (const n of _a) {
      const o = await D("chatScope", () => e.querySelector(n), null);
      if (o)
        try {
          const a = await o.getBoundingClientRect();
          if (a && a.height > 200) return o;
        } catch {
        }
    }
    return Ee(e);
  }
  async function dt(e) {
    if (!e) return [];
    for (const n of $a) try {
      const o = await e.querySelectorAll(n), a = typeof k.unwarpSafeArray == "function" ? await k.unwarpSafeArray(o) : [];
      if (a?.length) return a;
    } catch {
    }
    return [];
  }
  async function De(e) {
    try {
      if (typeof e.getInnerHTML == "function") return w(ln(await e.getInnerHTML()), 1e5);
    } catch {
    }
    try {
      if (typeof e.textContent == "function") return w(await e.textContent(), 1e5);
    } catch {
    }
    return "";
  }
  async function Za() {
    const e = Number(await D("getCurrentCharacterIndex", () => k.getCurrentCharacterIndex?.(), -1)), n = Number(await D("getCurrentChatIndex", () => k.getCurrentChatIndex?.(), -1)), o = e >= 0 ? await D("getCharacterFromIndex", () => k.getCharacterFromIndex?.(e), null) : null, a = e >= 0 && n >= 0 ? await D("getChatFromIndex", () => k.getChatFromIndex?.(e, n), null) : null, r = w(o?.chaId || o?.id || o?.name || `char_${e}`), i = w(a?.id || a?.chatId || `chat_${n}`), s = w(o?.name || o?.charName || "", 200), c = w(a?.name || a?.chatName || a?.title || `Chat ${n}`, 200), l = `risu_${ye(`${r}|${i}`)}`, VC = globalThis.__INLAY_VIEWER_CORE__, p = (Array.isArray(a?.message) ? a.message : []).map((m, u) => {
      const b = typeof VC?.rawMessageRole == "function" ? VC.rawMessageRole(m) : w(m?.role || m?.type || "").toLowerCase();
      return {
        index: u,
        role: b,
        text: yt(m),
        generationInfo: m?.generationInfo ?? m?.generation_info ?? null,
        isChar: b === "char" || b === "assistant" || b === "bot",
        isUser: b === "user"
      };
    });
    return {
      charIndex: e,
      chatIndex: n,
      character: o,
      chat: a,
      characterId: r,
      chatId: i,
      characterName: s,
      chatName: c,
      sessionId: l,
      messages: p
    };
  }
  async function ja() {
    try {
      return (await Za()).messages;
    } catch {
      return [];
    }
  }
  async function Oa(e, n, o, a) {
    try {
      if (!e || typeof e.elementFromPoint != "function") return -1;
      let r = await e.elementFromPoint(n, o);
      for (let i = 0; r && i < 14; i += 1) {
        for (let s = 0; s < a.length; s += 1) if (a[s] === r) return s;
        try {
          r = typeof r.getParent == "function" ? await r.getParent() : null;
        } catch {
          r = null;
        }
      }
    } catch {
    }
    return -1;
  }
  async function Ra(e, n, o) {
    for (let a = 0; a < o.length; a += 1) {
      let r;
      try {
        r = await o[a].getBoundingClientRect();
      } catch {
        continue;
      }
      if (r && e >= r.left && e <= r.right && n >= r.top && n <= r.bottom)
        return a;
    }
    return -1;
  }
  function qa(e, n, o, domCount, opts = {}) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const count = Number.isFinite(Number(domCount)) ? Number(domCount) : (Array.isArray(n) ? n.length : 0);
    if (typeof VC?.resolveChatMessageMatch == "function") {
      return VC.resolveChatMessageMatch(e, n, o, count, opts || {});
    }
    // Fallback if viewer-core is unavailable: newest-first DOM → reverse API index.
    const msgs = Array.isArray(n) ? n : [];
    const roleOf = (m) => typeof VC?.rawMessageRole == "function" ? VC.rawMessageRole(m) : w(m?.role || m?.type || "").toLowerCase();
    const rev = msgs.length - 1 - o;
    if (msgs.length && rev >= 0 && rev < msgs.length) {
      const m = msgs[rev];
      return {
        chatIndex: m.index,
        text: m.text || e || "",
        role: roleOf(m),
        matchMethod: "reverse",
        score: 80
      };
    }
    if (msgs.length && o >= 0 && o < msgs.length) {
      return {
        chatIndex: msgs[o].index,
        text: msgs[o].text || e || "",
        role: roleOf(msgs[o]),
        matchMethod: "dom",
        score: 40
      };
    }
    return {
      chatIndex: o,
      text: e || "",
      role: "",
      matchMethod: "fallback",
      score: 0
    };
  }
  function isSelectedCharRole(role) {
    if (t.backendSettings?.card?.generate_all_roles) return !0;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    return typeof VC?.isCharMessageRole == "function" ? VC.isCharMessageRole(role) : role === "char" || role === "assistant" || role === "bot";
  }
  function linkedCards(e) {
    if (!e) return [];
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const scoped = (t.gallery || []).filter((r) => {
      if (e.sessionId && r.session_id && r.session_id !== e.sessionId) return !1;
      if (e.characterId && r.character_id && r.character_id !== e.characterId) return !1;
      if (e.chatId && r.chat_id && r.chat_id !== e.chatId) return !1;
      return !0;
    });
    if (typeof VC?.linkCardsForMessage == "function") {
      return Me(VC.linkCardsForMessage(scoped, e));
    }
    // Fallback: hash-only identity.
    const o = scoped.filter((r) => r.content_hash && e.hash && r.content_hash === e.hash);
    return o.length ? Me(o) : [];
  }
  function ke(e) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.galleryForMessage == "function") return VC.galleryForMessage(t.gallery || [], e, 8);
    const n = (t.gallery || []).filter((o) => (!e?.sessionId || !o.session_id || o.session_id === e.sessionId) && (!e?.characterId || !o.character_id || o.character_id === e.characterId) && (!e?.chatId || !o.chat_id || o.chat_id === e.chatId)), o = linkedCards(e), a = /* @__PURE__ */ new Set(), r = [];
    for (const i of o) i?.id && !a.has(String(i.id)) && (a.add(String(i.id)), r.push(i));
    const selectedLen = r.length;
    const i = [...n].sort((s, c) => Number(c.created_at || 0) - Number(s.created_at || 0) || Number(c.message_index || 0) - Number(s.message_index || 0));
    for (const s of i) {
      if (r.length - selectedLen >= 8) break;
      s?.id && !a.has(String(s.id)) && (a.add(String(s.id)), r.push(s));
    }
    return r;
  }
  async function Da(e, n, opts = {}) {
    const rawSource = String(opts.source || "click"), source = rawSource === "scroll" || rawSource === "text" || rawSource === "provisional" ? rawSource : "click";
    const o = n[e];
    if (!o) return !1;
    const a = await De(o);
    if (!a || a.length < 4)
      return y("warn", "select.reject", `DOM#${e} text too short`), !1;
    // Identity is the on-screen DOM text. API align only supplies role/chatIndex.
    // (Using matched API text here made new bubbles hash-equal to an old slot → "same" → no gen.)
    const s = w(a), c = ye(s);
    if ((source === "scroll" || source === "text" || source === "provisional") && t.selectedMessage && Number(t.selectedMessage.domIndex) === Number(e) && t.selectedMessage.selectSource === source && t.selectedMessage.hash === c) return !0;
    const r = await Za();
    let prevText, nextText;
    try {
      if (n[e + 1]) prevText = await De(n[e + 1]);
      if (e > 0 && n[e - 1]) nextText = await De(n[e - 1]);
    } catch {
    }
    const i = qa(a, r.messages, e, Array.isArray(n) ? n.length : 0, { prevText, nextText }), l = w(i.role || "");
    t.lastScope = {
      charIndex: r.charIndex,
      chatIndex: r.chatIndex,
      characterId: r.characterId,
      chatId: r.chatId,
      sessionId: r.sessionId,
      character: r.character,
      chat: r.chat,
      characterName: r.characterName,
      chatName: r.chatName,
      liveChar: !0,
      liveChat: !0
    };
    if (t.selectedMessage?.hash === c && t.selectedMessage?.sessionId === r.sessionId && Number(t.selectedMessage?.chatIndex) === Number(i.chatIndex) && w(t.selectedMessage?.role || "") === l) {
      const prevDom = Number(t.selectedMessage.domIndex), domChanged = !Number.isFinite(prevDom) || prevDom !== Number(e);
      t.selectedMessage.domIndex = e, t.selectedMessage.charSlot = r.charIndex, t.selectedMessage.chatSlot = r.chatIndex, t.selectedMessage.characterId = r.characterId, t.selectedMessage.chatId = r.chatId, t.selectedMessage.characterName = r.characterName, t.selectedMessage.chatName = r.chatName, t.selectedMessage.sessionId = r.sessionId, t.selectedMessage.role = l, t.selectedMessage.matchMethod = i.matchMethod || t.selectedMessage.matchMethod, t.selectedMessage.text = s, t.selectedMessage.preview = We(s, 56), t.selectedMessage.selectedAt = Date.now(), t.selectedMessage.selectSource = source, y("info", "select.za", `hash=${c.slice(0, 16)} session=${r.sessionId || "-"} msg#${i.chatIndex} role=${l || "-"} via=${i.matchMethod || "-"} chars=${(i.text || s || "").length} same`), y("info", `select.${source}`, `char[${r.charIndex}] ${r.characterName} / chat[${r.chatIndex}] ${r.chatName} / msg#${i.chatIndex} role=${l || "-"} via=${i.matchMethod} same${domChanged ? " · DOM reload" : ""}`);
      if (source !== "scroll") {
        try {
          await ce(r.sessionId);
        } catch {
        }
      }
      let linked = linkedCards(t.selectedMessage);
      if (t.selectedMessage.hasImage = linked.length > 0, t.selectedMessage.cardCount = linked.length, t.selectedMessage.paragraphsWithImages = [...new Set(linked.map((C) => C.paragraph))].sort((C, S) => Number(C) - Number(S)), linked.length && (t.lastImagedMessage = {
        hash: t.selectedMessage.hash,
        chatIndex: t.selectedMessage.chatIndex,
        messageIndex: t.selectedMessage.messageIndex,
        sessionId: t.selectedMessage.sessionId,
        domIndex: t.selectedMessage.domIndex
      }), domChanged) {
        y("info", "select.same", `msg#${i.chatIndex} DOM#${prevDom}→#${e} rebind`);
        if (source === "scroll") {
          // Only rebind pinTarget to this bubble when it owns images; else keep lastImaged pin.
          if (linked.length && t.overlayUi) {
            t.overlayUi.pinTarget = o, t.overlayUi._pinDomIndex = e;
            try {
              const doc = t.overlayUi.doc || t.hostDoc;
              const els = t._msgElsCache?.doc === doc ? t._msgElsCache.els : null;
              if (doc && els) rememberNearbyMsgDoms(doc, els, e);
            } catch {
            }
            // Cache-hit hop: reuse pooled thumbs immediately (no wait for place create).
            const hopCards = Me(linked);
            const hopped = assembleMarkersFromPool(hopCards);
            if (hopped?.length) {
              const prev = t.overlayUi.markers || [];
              const keep = new Set(hopped.map((m) => String(m.card?.id || "")));
              parkMarkersToPool(prev.filter((m) => !keep.has(String(m?.card?.id || ""))));
              t.overlayUi.markers = hopped;
              t.overlayUi._lastStickyThumbHtmlId = null;
              t.overlayUi._flashSeg = null;
              invalidateOverlayLayoutCache();
              scheduleStickySync(!0);
            }
          }
          linked.length ? scheduleOverlayPlace(40) : scheduleStickySync();
          await onSelectionChanged(linked.length ? "content" : "chrome");
        } else {
          Ce(), scheduleOverlayPlace(80), await onSelectionChanged("content");
        }
        linked = linkedCards(t.selectedMessage), t.selectedMessage.hasImage = linked.length > 0, t.selectedMessage.cardCount = linked.length;
      } else {
        if (source === "scroll") {
          if (linked.length && t.overlayUi) {
            t.overlayUi.pinTarget = o, t.overlayUi._pinDomIndex = e;
            try {
              const doc = t.overlayUi.doc || t.hostDoc;
              const els = t._msgElsCache?.doc === doc ? t._msgElsCache.els : null;
              if (doc && els) rememberNearbyMsgDoms(doc, els, e);
            } catch {
            }
          }
          scheduleStickySync();
          if (linked.length && !(t.overlayUi?.markers?.length)) scheduleOverlayPlace(40);
        } else {
          Ce();
          if (linked.length && !(t.overlayUi?.markers?.length)) scheduleOverlayPlace(80);
        }
      }
      if (linked.length) return !0;
      if (source === "scroll" || source === "provisional") return !0;
      if (source === "text") return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", `msg#${i.chatIndex} noImage → retry`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
      return !isSelectedCharRole(l) ? !0 : (y("info", "select.same", `msg#${i.chatIndex} noImage → retry`), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
    }
    const p = Xt(a || s), m = {
      domIndex: e,
      chatIndex: i.chatIndex,
      messageIndex: i.chatIndex,
      charSlot: r.charIndex,
      chatSlot: r.chatIndex,
      characterId: r.characterId,
      chatId: r.chatId,
      characterName: r.characterName,
      chatName: r.chatName,
      sessionId: r.sessionId,
      role: l,
      matchMethod: i.matchMethod || "fallback",
      text: s,
      hash: c,
      paragraphCount: p.length || 1,
      preview: We(s, 56),
      selectedAt: Date.now(),
      selectSource: source,
      hasImage: !1,
      cardCount: 0,
      paragraphsWithImages: [],
      matchMode: "pending"
    };
    let u = linkedCards(m);
    if (!u.length && source !== "scroll") {
      try {
        u = await maybeRebindAndLink(m, r);
      } catch {
      }
    }
    let b = u.length ? "hash" : "none";
    m.hasImage = u.length > 0, m.cardCount = u.length, m.paragraphsWithImages = [...new Set(u.map((C) => C.paragraph))].sort((C, S) => Number(C) - Number(S)), m.matchMode = b, t.selectedMessage = m, t.lastOverlayFocusHash = c, y("info", `select.${source}`, `char[${r.charIndex}] ${r.characterName} / chat[${r.chatIndex}] ${r.chatName} / msg#${m.chatIndex} role=${l || "-"} via=${m.matchMethod} img=${m.hasImage ? "Y" : "N"} cards=${m.cardCount}`), y("info", "select.za", `hash=${c.slice(0, 16)} session=${r.sessionId || "-"} msg#${m.chatIndex} role=${l || "-"} via=${m.matchMethod || "-"} chars=${(i.text || s || "").length}`), y("info", "select.message", `DOM#${e} msg#${m.chatIndex} hash=${c.slice(0, 8)} role=${l || "-"} chars=${(i.text || s || "").length} "${m.preview}"`);
    if (source !== "scroll") {
      try {
        await ce(r.sessionId, !0);
      } catch {
      }
    }
    u = linkedCards(t.selectedMessage);
    if (!u.length && source !== "scroll") {
      try {
        u = await maybeRebindAndLink(t.selectedMessage, r);
      } catch {
      }
    }
    t.selectedMessage.hasImage = u.length > 0, t.selectedMessage.cardCount = u.length, t.selectedMessage.paragraphsWithImages = [...new Set(u.map((C) => C.paragraph))].sort((C, S) => Number(C) - Number(S)), t.selectedMessage.matchMode = u.length ? "hash" : "none";
    if (u.length) {
      t.lastImagedMessage = {
        hash: t.selectedMessage.hash,
        chatIndex: t.selectedMessage.chatIndex,
        messageIndex: t.selectedMessage.messageIndex,
        sessionId: t.selectedMessage.sessionId,
        domIndex: t.selectedMessage.domIndex
      };
    } else if (source !== "scroll") {
      // No hash cards → do not keep another message's images as this selection.
      t.lastImagedMessage = null;
    }
    if (source === "scroll") {
      // Keep previous sticky markers when the new message has no images (avoids wipe + gallery thrash).
      if (u.length) {
        if (t.overlayUi) {
        t.overlayUi.pinTarget = o, t.overlayUi._pinDomIndex = e;
        try {
          const doc = t.overlayUi.doc || t.hostDoc;
          const els = t._msgElsCache?.doc === doc ? t._msgElsCache.els : null;
          if (doc && els) rememberNearbyMsgDoms(doc, els, e);
        } catch {
        }
      }
        scheduleOverlayPlace(40), await onSelectionChanged("content");
      } else scheduleStickySync(), await onSelectionChanged("chrome");
      return !0;
    }
    return await onSelectionChanged("content"), scheduleOverlayPlace(80), t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), (source === "click" || source === "text") && await ensureMessageInView(o), source === "provisional" ? !0 : !isSelectedCharRole(l) ? (y("info", "select.user", "유저 메시지 — 자동 생성 안 함"), !0) : u.length ? (y("info", "select.hasImage", `cards=${u.length} · 재생성은 뷰어 버튼`), !0) : (y("info", "select.noImage", "해시 이미지 없음 → 태그부터 생성"), await Ka(t.selectedMessage.text, t.selectedMessage.hash), !0);
  }
  async function ensureMessageInView(el) {
    if (!el) return;
    try {
      const n = await el.getBoundingClientRect();
      if (!n) return;
      const o = typeof window < "u" && window.innerHeight || 800;
      if (n.top >= 72 && n.bottom <= o - 48) return;
      const a = await findScrollParent(el), r = n.top + n.height * 0.5 - o * 0.45;
      if (a) {
        const i = await getScrollTopSafe(a);
        if (await setScrollTopSafe(a, i + r)) return;
      }
      typeof window < "u" && window.scrollBy?.({ top: r, behavior: "auto" });
    } catch {
    }
  }
  async function Fa(e, n, o, opts = {}) {
    const a = await dt(await qe(e));
    if (!a.length)
      return y("warn", "select.fail", "no message elements"), !1;
    let r = await Oa(e, n, o, a);
    return r === -2 ? !1 : (r < 0 && (r = await Ra(n, o, a)), r < 0 ? (y("info", "select.miss", `x=${Math.round(n)} y=${Math.round(o)} msgs=${a.length}`), !1) : Da(r, a, {
      source: opts.source || "click"
    }));
  }
  function clickTrackEnabled() {
    return (t.backendSettings?.card || {}).click_message_track !== !1;
  }
  function messageSelectGesture() {
    return (t.backendSettings?.card || {}).message_select_gesture === "double" ? "double" : "single";
  }
  function messageSelectDetail() {
    return messageSelectGesture() === "double" ? 2 : 1;
  }
  function textDragSelectEnabled() {
    return (t.backendSettings?.card || {}).text_drag_select !== !1;
  }
  async function hasTextSelection(e) {
    try {
      const n = typeof e.getSelection == "function" ? await e.getSelection() : null, o = typeof n?.toString == "function" ? await n.toString() : String(n || "");
      return !!String(o || "").trim();
    } catch {
      return !1;
    }
  }
  async function excludedMessageTarget(e, n, o) {
    for (const candidate of [
      t.galleryUi?.panel,
      t.debugUi?.panel,
      t.debugUi?.fab,
      t.overlayUi?.pinned,
      t.overlayUi?.fullscreen
    ]) {
      try {
        if (candidate && await hitEl(candidate, n, o)) return !0;
      } catch {
      }
    }
    try {
      let a = await e.elementFromPoint(n, o);
      for (let r = 0; a && r < 12; r += 1) {
        try {
          if (String(await a.getAttribute?.("x-inlay-ignore") || "") === "true") return !0;
        } catch {
        }
        a = typeof a.getParent == "function" ? await a.getParent() : null;
      }
    } catch {
    }
    return !1;
  }
  function scrollTrackEnabled() {
    return (t.backendSettings?.card || {}).scroll_message_track !== !1;
  }
  async function getCachedMsgEls(e) {
    const n = t._msgElsCache;
    if (n && n.doc === e && Date.now() - n.at < 450 && Array.isArray(n.els) && n.els.length) {
      const hint = Number(t.overlayUi?._pinDomIndex ?? t.selectedMessage?.domIndex ?? t.lastImagedMessage?.domIndex);
      if (Number.isFinite(hint)) rememberNearbyMsgDoms(e, n.els, hint);
      return n.els;
    }
    const o = await dt(await qe(e));
    t._msgElsCache = {
      doc: e,
      at: Date.now(),
      els: o || []
    };
    const hint = Number(t.overlayUi?._pinDomIndex ?? t.selectedMessage?.domIndex ?? t.lastImagedMessage?.domIndex);
    if (Number.isFinite(hint)) rememberNearbyMsgDoms(e, t._msgElsCache.els, hint);
    return t._msgElsCache.els;
  }
  /** Prefer cursor-containing message; expand from last selection to avoid N SafeDOM rect reads. */
  async function pickMsgIndexNearPointer(els, anchorY, anchorX, vh) {
    const n = els?.length || 0;
    if (!n) return -1;
    const hint = Number(t.selectedMessage?.domIndex);
    const start = Number.isFinite(hint) ? Math.max(0, Math.min(n - 1, hint)) : Math.min(n - 1, Math.floor(n * 0.5));
    const rects = new Array(n);
    let contain = -1, containH = Infinity, best = -1, bestDist = Infinity;
    const consider = (i, p) => {
      if (!p || p.bottom <= 0 || p.top >= vh) return;
      const midY = (p.top + p.bottom) * 0.5;
      const midX = Number.isFinite(Number(p.left)) && Number.isFinite(Number(p.right)) ? (Number(p.left) + Number(p.right)) * 0.5 : null;
      const dist = midX != null && anchorX != null ? Math.hypot(midX - anchorX, midY - anchorY) : Math.abs(midY - anchorY);
      if (dist < bestDist) bestDist = dist, best = i;
      const inY = anchorY >= p.top && anchorY <= p.bottom;
      const inX = anchorX == null || !Number.isFinite(Number(p.left)) || !Number.isFinite(Number(p.right)) || anchorX >= Number(p.left) && anchorX <= Number(p.right);
      if (inY && inX) {
        const h = Math.max(1, p.bottom - p.top);
        if (h < containH) containH = h, contain = i;
      }
    };
    for (let d = 0; d < n; d += 1) {
      const idxs = d === 0 ? [start] : [start - d, start + d].filter((i) => i >= 0 && i < n);
      for (const i of idxs) {
        if (rects[i] !== void 0) continue;
        let p = null;
        try {
          p = await els[i].getBoundingClientRect();
        } catch {
          p = null;
        }
        rects[i] = p, consider(i, p);
      }
      if (contain >= 0) return contain;
      // After a small ring, if we already have a visible best and ring is outside cursor band, stop early.
      if (d >= 2 && best >= 0) {
        const bp = rects[best];
        if (bp && (anchorY < bp.top - 120 || anchorY > bp.bottom + 120)) break;
      }
    }
    if (contain >= 0) return contain;
    if (best >= 0) return best;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    for (let i = 0; i < n; i += 1) {
      if (rects[i] !== void 0) continue;
      try {
        rects[i] = await els[i].getBoundingClientRect();
      } catch {
        rects[i] = null;
      }
    }
    return typeof VC?.pickMessageIndexNearPoint == "function" ? VC.pickMessageIndexNearPoint(rects, anchorY, anchorX, vh) : best;
  }
  async function trackMessageByScroll() {
    if (!scrollTrackEnabled() || t.uiOpen || t._scrollTrackBusy) return;
    const e = t.overlayUi?.doc || await ue();
    if (!e) return;
    t._scrollTrackBusy = !0;
    try {
      const n = await getCachedMsgEls(e);
      if (!n.length) return;
      const o = typeof window < "u" && window.innerHeight || 800;
      const py = Number(t._pointerClientY), px = Number(t._pointerClientX);
      const anchorY = Number.isFinite(py) ? py : o * 0.5;
      const anchorX = Number.isFinite(px) ? px : null;
      const pick = await pickMsgIndexNearPointer(n, anchorY, anchorX, o);
      if (pick < 0) return;
      // Always re-enter Da — same DOM index can hold new text after a reply finishes.
      await Da(pick, n, { source: "scroll" });
    } finally {
      t._scrollTrackBusy = !1;
    }
  }
  function scheduleScrollTrack() {
    if (!scrollTrackEnabled() || t.uiOpen) return;
    if (!t._scrollSettle) {
      const VC = globalThis.__INLAY_VIEWER_CORE__, make = VC?.createScrollSettleTracker, settleMs = 55;
      t._scrollSettle = typeof make == "function" ? make({
        delayMs: settleMs,
        onSettle: () => {
          trackMessageByScroll().catch(() => {
          });
        }
      }) : {
        bump() {
          clearTimeout(t._scrollSettleTimer);
          t._scrollSettleTimer = setTimeout(() => {
            t._scrollSettleTimer = null, trackMessageByScroll().catch(() => {
            });
          }, settleMs);
        },
        settleNow() {
          clearTimeout(t._scrollSettleTimer), t._scrollSettleTimer = null, trackMessageByScroll().catch(() => {
          });
        },
        cancel() {
          clearTimeout(t._scrollSettleTimer), t._scrollSettleTimer = null;
        }
      };
    }
    t._scrollSettle.bump();
  }
  function settleScrollTrackNow() {
    if (!scrollTrackEnabled() || t.uiOpen) return;
    if (!t._scrollSettle) scheduleScrollTrack();
    t._scrollSettle?.settleNow?.();
  }
  function invalidateOverlayLayoutCache() {
    const e = t.overlayUi;
    e && (e.activeSegment = null, e._lastReading = null, e._segmentHidden = !1, e._lastThumbPct = null, e._lastInlineOn = null, e._lastOverlayX = null, e._lastOverlayY = null, e._lastMobileOn = null, e._lastCorner = null, e._lastMobilePinnedId = null, e._lastVpW = null, e._lastVpH = null, e._syncedViewerCardId = null, e._lastStickyThumbHtmlId = null, e._stickyThumbCollapsed = !1, e._stickyEditorOpen = !1);
  }
  async function Fe() {
    const e = t.overlayUi;
    if (e?.layer) {
      try {
        await e.layer.setInnerHTML("");
      } catch {
      }
      if (e.markers = [], e._stickyPool && e._stickyPool.clear(), e.pinTarget = null, e._pinDomIndex = null, e.edgeHint = null, invalidateOverlayLayoutCache(), typeof e.hidePreview == "function") try {
        await e.hidePreview();
      } catch {
      }
      else e.preview && typeof e.preview.setStyleAttribute == "function" && await e.preview.setStyleAttribute("position:fixed;display:none;z-index:99996;width:220px;pointer-events:none;");
    }
  }
  function stickyFocusMessage() {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.galleryFocusMessage == "function") return VC.galleryFocusMessage(t.selectedMessage, t.lastImagedMessage, t.gallery);
    if (t.selectedMessage && linkedCards(t.selectedMessage).length) return t.selectedMessage;
    return t.lastImagedMessage || t.selectedMessage || null;
  }
  function stickyCardKey(cards) {
    return (cards || []).map((c) => String(c?.id || "")).filter(Boolean).sort().join("|");
  }
  function stickyMarkerKey(markers) {
    return (markers || []).map((m) => String(m?.card?.id || "")).filter(Boolean).sort().join("|");
  }

  const STICKY_POOL_CAP = 30;
  function stickyPool() {
    const e = t.overlayUi;
    if (!e) return null;
    if (!e._stickyPool) e._stickyPool = /* @__PURE__ */ new Map();
    return e._stickyPool;
  }
  function hideStickyMarker(m) {
    if (!m) return;
    try {
      if (m.el && typeof m.el.setStyleAttribute == "function") m.el.setStyleAttribute(ze(0, -9999, Pt, !1));
    } catch {
    }
    try {
      if (m.thumb && typeof m.thumb.setStyleAttribute == "function") m.thumb.setStyleAttribute("position:fixed;display:none;");
    } catch {
    }
  }
  function trimStickyPool() {
    const pool = stickyPool();
    if (!pool || pool.size <= STICKY_POOL_CAP) return;
    const active = new Set((t.overlayUi?.markers || []).map((m) => String(m?.card?.id || "")).filter(Boolean));
    for (const [id, m] of pool) {
      if (pool.size <= STICKY_POOL_CAP) break;
      if (active.has(id)) continue;
      pool.delete(id);
      removeStickyMarkerNodes([m]).catch(() => {
      });
    }
  }
  function parkMarkersToPool(markers) {
    const pool = stickyPool();
    if (!pool) return;
    for (const m of markers || []) {
      const id = String(m?.card?.id || "");
      if (!id || !m?.thumb) continue;
      hideStickyMarker(m);
      pool.set(id, m);
    }
    trimStickyPool();
  }
  function takePooledMarker(card, src) {
    const id = String(card?.id || "");
    if (!id) return null;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const active = t.overlayUi?.markers;
    let m = typeof VC?.claimStickyMarkerByCardId == "function"
      ? VC.claimStickyMarkerByCardId(active, id)
      : null;
    if (!m && Array.isArray(active)) {
      const idx = active.findIndex((x) => String(x?.card?.id || "") === id);
      if (idx >= 0 && active[idx]?.thumb) m = active.splice(idx, 1)[0] || null;
    }
    if (!m) {
      const pool = stickyPool();
      if (!pool) return null;
      m = pool.get(id);
      if (!m?.thumb) return null;
      pool.delete(id);
    } else if (!m?.thumb) return null;
    m.card = card;
    if (src && (!m._thumbSrc || m._thumbSrc !== src)) {
      m._thumbSrc = src;
      // Keep painted HTML if same bytes already in the node; else force one paint later.
      if (m._paintedSrc && m._paintedSrc !== src) m._paintedSrc = "", m._thumbHtmlId = "";
    }
    return m;
  }
  /** Assemble sticky markers from pool/current when every card already has a painted thumb. */
  function assembleMarkersFromPool(cards) {
    const e = t.overlayUi;
    if (!e || !(cards || []).length) return null;
    const pool = stickyPool();
    const byId = /* @__PURE__ */ new Map();
    for (const m of e.markers || []) {
      const id = String(m?.card?.id || "");
      if (id) byId.set(id, m);
    }
    if (pool) for (const [id, m] of pool) if (!byId.has(id)) byId.set(id, m);
    const slots = Math.max(1, cards.length);
    const ranked = (cards || []).map((card, ci) => ({
      card,
      ci,
      yPercent: Ot(card, ci, slots)
    })).sort((a, b) => a.yPercent - b.yPercent || a.ci - b.ci);
    const out = [];
    for (const row of ranked) {
      const id = String(row.card?.id || "");
      const m = byId.get(id);
      if (!m?.thumb || !m._thumbSrc) return null;
      m.card = row.card, m.yPercent = row.yPercent, m.paragraph = row.card?.paragraph, m.line = row.ci;
      out.push(m);
      if (pool) pool.delete(id);
    }
    return out;
  }
  async function prebuildStickyPool(ids) {
    const e = t.overlayUi, n = e?.doc || t.hostDoc;
    if (!e?.layer || !n || !(ids || []).length) return;
    const pool = stickyPool();
    if (!pool) return;
    const active = new Set((e.markers || []).map((m) => String(m?.card?.id || "")).filter(Boolean));
    for (const raw of ids) {
      const id = String(raw || "");
      if (!id || pool.has(id) || active.has(id)) continue;
      const card = (t.gallery || []).find((c) => String(c?.id) === id);
      if (!card) continue;
      let src = "";
      try {
        const fb = Ie(card);
        if (typeof fb == "string" && /^data:image\//i.test(fb)) src = fb;
      } catch {
      }
      if (!src) continue;
      try {
        const X = await H(n, "div", {
          style: "position:fixed;display:none;z-index:99970;",
          html: `<img src="${src}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent" />`
        });
        await e.layer.appendChild(X);
        const te = await H(n, "div", {
          style: ze(0, -9999, Pt, !1),
          html: "🖼"
        });
        await e.layer.appendChild(te);
        pool.set(id, {
          el: te,
          thumb: X,
          card,
          paragraph: card.paragraph,
          yPercent: 0,
          active: !1,
          edge: null,
          line: 0,
          hitPad: 12,
          _thumbSrc: src,
          _paintedSrc: src,
          _thumbHtmlId: id,
          _pinHtml: "🖼"
        });
      } catch {
      }
    }
    trimStickyPool();
  }

  async function removeStickyMarkerNodes(markers) {
    for (const m of markers || []) {
      for (const el of [m?.thumb, m?.el]) {
        if (!el) continue;
        try {
          if (typeof el.remove == "function") await el.remove();
          else if (el.parentNode && typeof el.parentNode.removeChild == "function") await el.parentNode.removeChild(el);
          else if (typeof el.setStyleAttribute == "function") await el.setStyleAttribute("position:fixed;display:none;");
        } catch {
        }
      }
    }
  }
  function ze(e, n, o, a) {
    return [
      "position:fixed",
      `left:${e}px`,
      `top:${n}px`,
      "z-index:99974",
      `width:${o}px`,
      `height:${o}px`,
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:11px",
      a ? "pointer-events:auto" : "pointer-events:none",
      a ? "opacity:1" : "opacity:0",
      "background:rgba(124,108,255,.94)",
      "color:#fff",
      "border:1px solid rgba(255,255,255,.22)",
      "box-shadow:0 2px 8px rgba(0,0,0,.35)"
    ].join(";");
  }
  function edgePosCss(box = {}) {
    return [
      box.left != null ? `left:${box.left}px` : "left:auto",
      box.right != null ? `right:${box.right}px` : "right:auto",
      box.top != null ? `top:${box.top}px` : "top:auto",
      box.bottom != null ? `bottom:${box.bottom}px` : "bottom:auto"
    ];
  }
  function zeEdge(edge, a) {
    const o = Math.max(1, Number(edge?.size) || Pt);
    return [
      "position:fixed",
      ...edgePosCss(edge),
      "z-index:99974",
      `width:${o}px`,
      `height:${o}px`,
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:11px",
      a ? "pointer-events:auto" : "pointer-events:none",
      a ? "opacity:1" : "opacity:0",
      "background:rgba(124,108,255,.94)",
      "color:#fff",
      "border:1px solid rgba(255,255,255,.22)",
      "box-shadow:0 2px 8px rgba(0,0,0,.35)"
    ].join(";");
  }
  function za(e, n, o) {
    return [
      "position:fixed",
      `left:${e}px`,
      `top:${n}px`,
      "z-index:99974",
      `width:${o}px`,
      `height:${o}px`,
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:8px",
      "pointer-events:auto",
      "opacity:1",
      "background:rgba(15,23,42,.92)",
      "color:#e2e8f0",
      "border:1px solid rgba(124,108,255,.5)",
      "box-shadow:0 2px 6px rgba(0,0,0,.3)"
    ].join(";");
  }
  function Ga() {
    return (t.backendSettings?.card || {}).overlay_hide_offscreen !== !1;
  }
  function scheduleOverlayPlace(delayMs = 100) {
    if (t.uiOpen || t._hostChromeBlocked) return;
    t._overlayPlaceTimer && clearTimeout(t._overlayPlaceTimer);
    t._overlayPlaceTimer = setTimeout(() => {
      t._overlayPlaceTimer = null;
      if (t.uiOpen || t._hostChromeBlocked) return;
      he().catch(() => {
      });
    }, Math.max(40, Number(delayMs) || 100));
  }
  async function onSelectionChanged(mode = "content") {
    if (t.uiOpen) return;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    const next = mode || "content";
    t._viewerPaintJob = VC?.mergeViewerPaintJob ? VC.mergeViewerPaintJob(t._viewerPaintJob, next) : next;
    if (t._viewerPaintScheduled) return;
    t._viewerPaintScheduled = !0;
    const run = async () => {
      t._viewerPaintScheduled = !1;
      const job = t._viewerPaintJob || "content";
      t._viewerPaintJob = null;
      if (t.uiOpen) return;
      if (t.galleryUi?.renderGal) await t.galleryUi.renderGal(job);
    };
    if (typeof queueMicrotask == "function") queueMicrotask(() => {
      run().catch(() => {
      });
    });
    else setTimeout(() => {
      run().catch(() => {
      });
    }, 0);
  }

  const NEARBY_DOM_RADIUS = 2;
  const NEARBY_DOM_TTL_MS = 2500;
  function rememberNearbyMsgDoms(doc, els, centerIndex, radius = NEARBY_DOM_RADIUS) {
    try {
      if (!doc || !Array.isArray(els) || !els.length) return;
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const win = typeof VC?.nearbyDomIndexWindow == "function"
        ? VC.nearbyDomIndexWindow(centerIndex, els.length, radius)
        : null;
      const r = Math.max(0, Number(radius) || NEARBY_DOM_RADIUS);
      const c = Math.max(0, Math.min(els.length - 1, Number(centerIndex) || 0));
      const lo = win ? win.lo : Math.max(0, c - r);
      const hi = win ? win.hi : Math.min(els.length - 1, c + r);
      const byIndex = /* @__PURE__ */ Object.create(null);
      for (let i = lo; i <= hi; i += 1) {
        if (els[i]) byIndex[i] = els[i];
      }
      t._nearbyMsgDomCache = {
        doc,
        at: Date.now(),
        center: c,
        radius: r,
        lo,
        hi,
        byIndex
      };
    } catch {
    }
  }
  function peekCachedMsgDom(doc, domIndex) {
    try {
      const cache = t._nearbyMsgDomCache;
      if (!cache || cache.doc !== doc) return null;
      if (Date.now() - cache.at > NEARBY_DOM_TTL_MS) return null;
      const idx = Number(domIndex);
      if (!Number.isFinite(idx) || idx < 0) return null;
      return cache.byIndex?.[idx] || null;
    } catch {
      return null;
    }
  }
  function isNearbyDomMove(prevIndex, nextIndex, radius = NEARBY_DOM_RADIUS) {
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    if (typeof VC?.isNearbyDomIndex == "function") return VC.isNearbyDomIndex(prevIndex, nextIndex, radius);
    const a = Number(prevIndex), b = Number(nextIndex);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= (Number(radius) || NEARBY_DOM_RADIUS);
  }
  function warmStickyMarkerImages(cards, focus) {
    try {
      const N = globalThis.__INLAY_NATIVE__;
      const VC = globalThis.__INLAY_VIEWER_CORE__;
      const extra = (cards || []).map((c) => c?.id).filter(Boolean);
      // Current sticky markers + same-chat messages at focus ±2 (data-URL cache for snappy scroll).
      const focusMsg = focus || stickyFocusMessage() || t.selectedMessage || t.lastImagedMessage || null;
      let ids = extra;
      if (typeof VC?.nearbyMessageImageIds == "function") {
        ids = VC.nearbyMessageImageIds(t.gallery || [], focusMsg, 2, extra);
      } else if (!ids.length && focusMsg) {
        const idx = Number(focusMsg.messageIndex ?? focusMsg.message_index);
        const sessionId = String(focusMsg.sessionId || "");
        ids = (t.gallery || []).filter((c) => {
          if (!c?.id) return !1;
          if (sessionId && c.session_id && c.session_id !== sessionId) return !1;
          const mi = Number(c.message_index);
          return Number.isFinite(idx) && Number.isFinite(mi) && Math.abs(mi - idx) <= 2;
        }).map((c) => c.id);
      }
      ids = [...new Set((ids || []).filter(Boolean))];
      if (!ids.length) return;
      if (typeof N?.pinImageUrls == "function") N.pinImageUrls(ids);
      if (typeof N?.warmImages == "function") {
        N.warmImages(ids).then(() => {
          const e = t.overlayUi;
          if (e?.markers?.length) {
            for (const mk of e.markers) {
              try {
                const fresh = Ie(mk.card);
                if (typeof fresh == "string" && /^data:image\//i.test(fresh) && fresh !== mk._thumbSrc) mk._thumbSrc = fresh;
              } catch {
              }
            }
          }
          // Pre-paint nearby thumbs off-screen so message hops skip SafeDOM create+data URL inject.
          prebuildStickyPool(ids).catch(() => {
          });
        }).catch(() => {
        });
      } else {
        prebuildStickyPool(ids).catch(() => {
        });
      }
    } catch {
    }
  }
  function scheduleStickySync(forceFull = !1) {
    if (forceFull && t.overlayUi) t.overlayUi._stickyWantFull = !0;
    Ce();
  }
  /** Instant within-message image swap: estimate reading% from last pin rect + scrollY delta. */
  function stickyFlashOnScroll() {
    const e = t.overlayUi;
    if (t.uiOpen || !e?.markers?.length || !Nt()) return;
    const showStyle = e._stickyThumbShowStyle;
    if (!showStyle || !e._pinRectCache || e._pinRectAtScrollY == null) return;
    const scrollY = Number(e._liveScrollY);
    if (!Number.isFinite(scrollY)) return;
    const base = e._pinRectCache;
    const delta = scrollY - Number(e._pinRectAtScrollY);
    const est = {
      top: Number(base.top) - delta,
      bottom: Number(base.bottom) - delta,
      left: Number(base.left) || 0,
      right: Number(base.right) || 0,
      width: Number(base.width) || 0,
      height: Number(base.height) || 0
    };
    const r = viewerViewport().vh, i = 0.5;
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    let c = typeof VC?.readingPercentInMessage == "function" ? VC.readingPercentInMessage(est, r, i) : na(est, r, i);
    if (c == null) c = typeof VC?.clampReadingPercent == "function" ? VC.clampReadingPercent(est, r, i) : cn(est, r, i);
    if (c == null || !Number.isFinite(Number(c))) return;
    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    const l = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, c) : dn(markerPcts, c);
    if (l < 0) return;
    if (l === e._flashSeg && e._flashReading != null && Math.abs(e._flashReading - c) < 0.5) return;
    const next = e.markers[l];
    if (!next?.thumb || !next._thumbSrc) return;
    const prevSeg = e._flashSeg != null ? e._flashSeg : e.activeSegment;
    const prev = Number.isFinite(prevSeg) && prevSeg >= 0 ? e.markers[prevSeg] : null;
    const hideStyle = "position:fixed;display:none;";
    const activeId = String(next.card?.id || "");
    const composeThumb = typeof VC?.composeStickyThumbHtml == "function" ? VC.composeStickyThumbHtml : (src0) => `<img src="${src0}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent" />`;
    const needsPaint = typeof VC?.stickyThumbNeedsHtmlPaint == "function"
      ? VC.stickyThumbNeedsHtmlPaint(next._paintedSrc, next._thumbSrc, next._thumbHtmlId, activeId)
      : next._thumbHtmlId !== activeId || next._paintedSrc !== next._thumbSrc;
    e._flashGen = (e._flashGen || 0) + 1;
    const flashGen = e._flashGen;
    e._flashSeg = l;
    e._flashReading = c;
    // Optimistic: claim active segment so a slow Ht does not briefly flash the old shot.
    e.activeSegment = l;
    e._lastReading = c;
    (async () => {
      try {
        if (flashGen !== e._flashGen) return;
        // Show/hide only when this marker already holds its image — avoid re-injecting MB data URLs.
        if (needsPaint && typeof next.thumb.setInnerHTML == "function") {
          await next.thumb.setInnerHTML(composeThumb(next._thumbSrc));
          if (flashGen !== e._flashGen) return;
          next._thumbHtmlId = activeId, next._paintedSrc = next._thumbSrc, e._lastStickyThumbHtmlId = activeId;
        }
        if (flashGen !== e._flashGen) return;
        await next.thumb.setStyleAttribute(showStyle);
        if (flashGen !== e._flashGen) return;
        if (prev?.thumb && prev !== next) await prev.thumb.setStyleAttribute(hideStyle);
      } catch {
      }
    })();
  }
  function Ce() {
    if (t.uiOpen) return;
    if (!t.overlayUi?.markers?.length) return;
    if (t.overlaySyncing) {
      t.overlaySyncPending = !0;
      return;
    }
    const wantFull = !!t.overlayUi._stickyWantFull;
    t.overlayUi._stickyWantFull = !1;
    t.overlaySyncing = !0, Ht({ light: !wantFull }).catch(() => {
    }).finally(() => {
      t.overlaySyncing = !1, t.overlaySyncPending && (t.overlaySyncPending = !1, Ce());
    });
  }
  async function fe(e, n, o, a = !1) {
    if (!e || typeof e.addEventListener != "function") return null;
    if (a) {
      const r = await D(`listenCap:${n}`, () => e.addEventListener(n, o, {
        capture: !0,
        passive: !0
      }), null);
      return r ?? D(`listenCapBool:${n}`, () => e.addEventListener(n, o, !0), null);
    }
    return D(`listen:${n}`, () => e.addEventListener(n, o), null);
  }
  async function de(e, n, o) {
    !e || o == null || typeof e.removeEventListener != "function" || (await D("rmListen", () => e.removeEventListener(n, o), null), await D("rmListenId", () => e.removeEventListener(o), null));
  }
  async function zt() {
    const e = t.overlayUi, n = e?.extraScrollBindings || [];
    for (const o of n) await de(o.el, o.type || "scroll", o.id);
    e && (e.extraScrollBindings = []);
  }
  async function Ha(e) {
    const n = t.overlayUi;
    if (!n?.onStickyScroll || !e) return;
    await zt();
    const o = [], a = /* @__PURE__ */ new Set();
    let r = e;
    for (let i = 0; r && i < 18; i += 1) {
      if (!a.has(r)) {
        a.add(r);
        for (const s of ["scroll", "scrollend"]) {
          const c = await fe(r, s, n.onStickyScroll, !0);
          c != null && o.push({
            el: r,
            id: c,
            type: s
          });
        }
      }
      try {
        r = typeof r.getParent == "function" ? await r.getParent() : null;
      } catch {
        r = null;
      }
    }
    n.extraScrollBindings = o, y("info", "overlay.scrollBind", `ancestors=${o.length}`);
  }
  async function Wa(e) {
    const n = t.overlayUi;
    n?.onStickyScroll && (e && (n.chatScrollEl !== e || n.chatScrollId == null) && (n.chatScrollEl && n.chatScrollId != null && await de(n.chatScrollEl, "scroll", n.chatScrollId), n.chatScrollEl = e, n.chatScrollId = await fe(e, "scroll", n.onStickyScroll, !0)), n.pinTarget && await Ha(n.pinTarget), Gt());
  }
  function Gt() {
    const e = t.overlayUi;
    !e || e.segmentWatchId != null || (e._scopeTick = 0,     e.segmentWatchId = setInterval(() => {
      const n = t.overlayUi;
      if (n && (n._scopeTick = (n._scopeTick || 0) + 1, n._scopeTick % 24 === 0 && !(t.jobsInFlight.size || (t.jobProgress && formatViewerJob(t.jobProgress)?.busy)) && Z().catch(() => {
      }), !!t.selectedMessage)) {
        const jobBusy = !!(t.jobsInFlight.size || (t.jobProgress && formatViewerJob(t.jobProgress)?.busy));
        if (t.selectedMessage.sessionId && t.lastScope?.sessionId && t.selectedMessage.sessionId !== t.lastScope.sessionId) {
          // Never drop the message link mid-generation.
          if (jobBusy || (t.selectedMessage.hash && t.jobsInFlight.has(t.selectedMessage.hash))) return;
          t.selectedMessage = null, t.lastImagedMessage = null, Fe().catch(() => {
          });
          return;
        }
        n.markers?.length && Ce();
      }
    }, 250));
  }
  function Va() {
    const e = t.overlayUi;
    e?.segmentWatchId != null && (clearInterval(e.segmentWatchId), e.segmentWatchId = null);
  }
  async function Ht(opts = {}) {
    const e = t.overlayUi;
    if (!e?.markers?.length) return;
    const light = !!opts.light && !!e.pinTarget && !!e._pinRectCache;
    // Full pass resolves pin ownership; light scroll pass skips that SafeDOM round-trip.
    if (!light && (t.selectedMessage || t.lastImagedMessage)) {
      const n = e.doc || await ue();
      if (n) {
        const pin = await resolveStickyPinDom(n);
        if (pin.el) e.pinTarget = pin.el, e._pinDomIndex = Number(pin.msg?.domIndex);
      }
    }
    const o = Pt, r = viewerViewport().vh, i = 0.5;
    let s = null;
    if (e.pinTarget) {
      try {
        s = await e.pinTarget.getBoundingClientRect();
        if (s) {
          e._pinRectCache = s;
          const y = Number(e._liveScrollY);
          e._pinRectAtScrollY = Number.isFinite(y) ? y : typeof window < "u" ? window.scrollY || window.pageYOffset || 0 : 0;
        }
      } catch {
        s = e._pinRectCache || null;
      }
    } else {
      s = e._pinRectCache || null;
    }
    const a = resolvePinLeftX(), j = resolvePinTopY(o), overlayXNow = getPinXPct(), overlayYNow = getPinYPct();
    const VC = globalThis.__INLAY_VIEWER_CORE__;
    let c;
    if (s) {
      c = typeof VC?.readingPercentInMessage == "function" ? VC.readingPercentInMessage(s, r, i) : na(s, r, i);
      if (c == null) c = typeof VC?.clampReadingPercent == "function" ? VC.clampReadingPercent(s, r, i) : cn(s, r, i);
    } else {
      // DOM missing: keep last reading / middle so sticky never blanks out.
      c = e._lastReading != null ? e._lastReading : 50;
    }
    const markerPcts = e.markers.map((T) => Number(T.yPercent) || 0);
    const l = typeof VC?.activeSegmentIndex == "function" ? VC.activeSegmentIndex(markerPcts, c) : dn(markerPcts, c);
    const p = Nt(), mobileOn = mobilePinOn(), m = La(), cornerNow = Ea();
    const activeIdNow = l >= 0 ? e.markers[l]?.card?.id || "" : "";
    // Offscreen hide only affects the always-on thumb — pin itself always stays.
    const hideThumbOffscreen = !!(s && Ga() && (typeof VC?.readingPercentInMessage == "function" ? VC.readingPercentInMessage(s, r, i) : na(s, r, i)) == null && !(Number(s.bottom) > 0 && Number(s.top) < r));
    const vpW = typeof window < "u" && window.innerWidth || 1200, vpH = typeof window < "u" && window.innerHeight || 800;
    // Skip only when segment AND active card unchanged (tiny reading jitter).
    // Viewport size must be included — right/bottom corners were sticky-left px and went stale on resize.
    if (e.activeSegment === l && !e._segmentHidden && e._lastReading != null && Math.abs(e._lastReading - c) < 0.35 && e._lastThumbPct === m.pct && e._lastInlineOn === p && e._lastOverlayX === overlayXNow && e._lastOverlayY === overlayYNow && e._lastMobileOn === mobileOn && e._lastCorner === cornerNow && e._lastMobilePinnedId === activeIdNow && e._lastHideThumbOff === hideThumbOffscreen && e._lastVpW === vpW && e._lastVpH === vpH) return;
    const prevSeg = e.activeSegment;
    e.activeSegment = l, e._lastReading = c, e._segmentHidden = !1, e._lastThumbPct = m.pct, e._lastInlineOn = p, e._lastOverlayX = overlayXNow, e._lastOverlayY = overlayYNow, e._lastMobileOn = mobileOn, e._lastCorner = cornerNow, e._lastHideThumbOff = hideThumbOffscreen, e._lastVpW = vpW, e._lastVpH = vpH;
    const showStickyImg = m.pct > 0 && !hideThumbOffscreen, u = 6, b = 11, C = 4;
    let pinLeft = a, pinTop = j, thumbLeft = Math.max(4, a - m.w - u), thumbTop = j + o + u;
    let pinEdge = null, thumbEdge = null;
    if (mobileOn && p) {
      // Edge-anchored CSS (right/bottom) so window resize keeps the corner glue without waiting on layout.
      thumbEdge = typeof VC?.stickyCornerEdgeBox == "function" ? VC.stickyCornerEdgeBox(cornerNow, m, 16) : null;
      pinEdge = typeof VC?.stickyPinEdgeBox == "function" ? VC.stickyPinEdgeBox(cornerNow, m, o, 6, 16) : null;
      const box = typeof VC?.stickyCornerImageBox == "function" ? VC.stickyCornerImageBox(cornerNow, m, {
        width: vpW,
        height: vpH
      }, 16) : {
        left: Math.max(16, vpW - m.w - 16),
        top: Math.max(16, vpH - m.h - 16),
        w: m.w,
        h: m.h
      };
      const pinPos = typeof VC?.stickyPinOverImage == "function" ? VC.stickyPinOverImage(box, o, 6) : {
        left: Math.round(box.left + (box.w - o) / 2),
        top: box.top - 6
      };
      // Absolute coords kept for ▲/▼ mini-pin stacking relative to the active pin.
      pinLeft = pinPos.left, pinTop = pinPos.top, thumbLeft = box.left, thumbTop = box.top;
      if (!thumbEdge) thumbEdge = {
        w: m.w,
        h: m.h,
        top: String(cornerNow).includes("top") ? 16 : null,
        bottom: String(cornerNow).includes("bottom") ? 16 : null,
        left: String(cornerNow).includes("left") ? 16 : null,
        right: String(cornerNow).includes("right") ? 16 : null
      };
      if (!pinEdge) pinEdge = {
        size: o,
        top: pinTop,
        bottom: null,
        left: pinLeft,
        right: null
      };
    }
    const f = pinTop + o + C, x = Math.round(pinLeft + (o - b) / 2), I = l >= 0 ? l : 0, R = l >= 0 ? Math.max(0, e.markers.length - l - 1) : 0;
    let g = 0, F = 0;
    const activeCard = l >= 0 ? e.markers[l]?.card : null;
    e._lastMobilePinnedId = activeCard?.id || "";
    const thumbShowStyle = thumbEdge ? [
      "position:fixed",
      ...edgePosCss(thumbEdge),
      "z-index:99970",
      `width:${m.w}px`,
      `height:${m.h}px`,
      "border-radius:8px",
      "overflow:hidden",
      "pointer-events:auto",
      "display:block",
      "border:1px solid rgba(255,255,255,.16)",
      "box-shadow:0 4px 14px rgba(0,0,0,.35)",
      "background:transparent"
    ].join(";") : [
      "position:fixed",
      `left:${thumbLeft}px`,
      `top:${thumbTop}px`,
      "z-index:99970",
      `width:${m.w}px`,
      `height:${m.h}px`,
      "border-radius:8px",
      "overflow:hidden",
      "pointer-events:auto",
      "display:block",
      "border:1px solid rgba(255,255,255,.16)",
      "box-shadow:0 4px 14px rgba(0,0,0,.35)",
      "background:transparent"
    ].join(";");
    e._stickyThumbShowStyle = thumbShowStyle;
    const hideThumbStyle = "position:fixed;display:none;";
    const composeThumb = typeof VC?.composeStickyThumbHtml == "function" ? VC.composeStickyThumbHtml : (src) => `<img src="${src}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent" />`;

    // 1) Show active thumb (paint HTML only on cache miss) — never blank the slot.
    try {
      if (l >= 0 && e.markers[l]) {
        const v = e.markers[l];
        if (!v._thumbSrc) {
          try {
            const fb = Ie(v.card);
            if (typeof fb == "string" && /^data:image\//i.test(fb)) v._thumbSrc = fb;
          } catch {
          }
        }
        if (v.thumb) {
          if (showStickyImg) {
            const needHtml = typeof VC?.stickyThumbNeedsHtmlPaint == "function"
              ? VC.stickyThumbNeedsHtmlPaint(v._paintedSrc, v._thumbSrc, v._thumbHtmlId, activeIdNow)
              : v._thumbHtmlId !== activeIdNow || v._paintedSrc !== v._thumbSrc;
            if (needHtml && v._thumbSrc && typeof v.thumb.setInnerHTML == "function") {
              await v.thumb.setInnerHTML(composeThumb(v._thumbSrc));
              v._thumbHtmlId = activeIdNow, v._paintedSrc = v._thumbSrc, e._lastStickyThumbHtmlId = activeIdNow, e._flashSeg = l, e._flashReading = c;
            }
            await v.thumb.setStyleAttribute(thumbShowStyle);
          } else await v.thumb.setStyleAttribute(hideThumbStyle);
        }
        await v.el.setStyleAttribute(pinEdge ? zeEdge(pinEdge, !0) : ze(pinLeft, pinTop, o, !0));
        if (v._pinHtml !== "🖼" && typeof v.el.setInnerHTML == "function") {
          await v.el.setInnerHTML("🖼"), v._pinHtml = "🖼";
        }
      }
      // Retire previous only after the new image is already on screen.
      if (Number.isFinite(prevSeg) && prevSeg >= 0 && prevSeg !== l && e.markers[prevSeg]?.thumb) {
        await e.markers[prevSeg].thumb.setStyleAttribute(hideThumbStyle);
      }
    } catch {
    }

    // 2) Heavy / chrome after the image is already visible.
    const syncId = String(activeCard?.id || "");
    if (syncId && syncId !== String(e._syncedViewerCardId || "")) {
      e._syncedViewerCardId = syncId;
      const gui = t.galleryUi;
      if (gui && !t.uiOpen && typeof gui.syncToCardId == "function") {
        gui.syncToCardId(syncId).catch(() => {
        });
      }
    }
    // Keep legacy pinned layer hidden — mobile uses the same sticky thumb now.
    if (typeof e.hidePinned === "function") {
      Promise.resolve(e.hidePinned()).catch(() => {
      });
    }

    for (let T = 0; T < e.markers.length; T += 1) {
      const v = e.markers[T], X = T === l;
      v.active = X, v.mini = !X && l >= 0;
      if (X) continue;
      let te;
      l < 0 ? (te = -9999, v.mini = !1) : T < l ? (te = pinTop - (I - g) * 15, g += 1) : (te = f + F * 15, F += 1);
      try {
        if (te < 0 || l < 0) await v.el.setStyleAttribute(ze(pinLeft, -9999, o, !1));
        else {
          await v.el.setStyleAttribute(za(x, te, b));
          const arrow = T < l ? "▲" : "▼";
          if (v._pinHtml !== arrow && typeof v.el.setInnerHTML == "function") {
            await v.el.setInnerHTML(arrow), v._pinHtml = arrow;
          }
          if (typeof v.el.setAttribute == "function") await v.el.setAttribute("title", T < l ? `위에 이미지 · P${v.card?.paragraph ?? v.line} · ${Math.round(v.yPercent)}%` : `아래에 이미지 · P${v.card?.paragraph ?? v.line} · ${Math.round(v.yPercent)}%`);
        }
      } catch {
      }
      if (v.thumb) try {
        await v.thumb.setStyleAttribute(hideThumbStyle);
      } catch {
      }
    }
    t.debugInsight && (t.debugInsight.readingPct = c, t.debugInsight.activeSegment = l, t.debugInsight.abovePins = I, t.debugInsight.belowPins = R, t.debugInsight.markerPercents = markerPcts);
  }
  async function resolveMessageDom(e, msg) {
    const n = msg || null;
    if (!n || !e) return null;
    // ±2 DOM cache hit: skip list wait when we already remembered this bubble.
    if (n.domIndex >= 0) {
      const cached = peekCachedMsgDom(e, n.domIndex);
      if (cached) return cached;
    }
    const o = await getCachedMsgEls(e) || await dt(await qe(e));
    if (n.domIndex >= 0 && n.domIndex < (o || []).length) {
      rememberNearbyMsgDoms(e, o, n.domIndex);
      return o[n.domIndex];
    }
    for (let a = 0; a < (o || []).length; a += 1) {
      const r = await De(o[a]);
      if (r && (ye(r) === n.hash || ot(r, {
        assistant_preview: n.text,
        content_hash: n.hash
      }) >= 50))
        return n.domIndex = a, o[a];
    }
    return null;
  }
  async function Ge(e) {
    return resolveMessageDom(e, t.selectedMessage);
  }
  async function resolveStickyPinDom(e) {
    const focus = stickyFocusMessage();
    if (focus) {
      const el = await resolveMessageDom(e, focus);
      if (el) return { el, msg: focus };
    }
    if (t.selectedMessage) {
      const el = await resolveMessageDom(e, t.selectedMessage);
      if (el) return { el, msg: t.selectedMessage };
    }
    return { el: null, msg: focus || t.selectedMessage || null };
  }
  async function getScrollTopSafe(e) {
    if (!e) return 0;
    try {
      if (typeof e.getProperty == "function") {
        const n = await e.getProperty("scrollTop");
        if (n != null) return Number(n) || 0;
      }
    } catch {
    }
    try {
      if (typeof e.scrollTop == "number") return e.scrollTop;
      const n = await e.scrollTop;
      if (n != null) return Number(n) || 0;
    } catch {
    }
    return 0;
  }
  async function setScrollTopSafe(e, n) {
    if (!e) return !1;
    const o = Math.max(0, Number(n) || 0);
    try {
      if (typeof e.scrollTo == "function") return await e.scrollTo({
        top: o,
        behavior: "auto"
      }), !0;
    } catch {
    }
    try {
      if (typeof e.scrollTo == "function") return await e.scrollTo(0, o), !0;
    } catch {
    }
    try {
      if (typeof e.setProperty == "function") return await e.setProperty("scrollTop", o), !0;
    } catch {
    }
    try {
      return e.scrollTop = o, !0;
    } catch {
    }
    return !1;
  }
  async function getScrollLeftSafe(e) {
    if (!e) return 0;
    try {
      if (typeof e.getProperty == "function") {
        const n = await e.getProperty("scrollLeft");
        if (n != null) return Number(n) || 0;
      }
    } catch {
    }
    try {
      if (typeof e.scrollLeft == "number") return e.scrollLeft;
      const n = await e.scrollLeft;
      if (n != null) return Number(n) || 0;
    } catch {
    }
    return 0;
  }
  async function setScrollLeftSafe(e, n) {
    if (!e) return !1;
    const o = Math.max(0, Number(n) || 0);
    try {
      if (typeof e.scrollTo == "function") return await e.scrollTo({
        left: o,
        behavior: "auto"
      }), !0;
    } catch {
    }
    try {
      if (typeof e.scrollTo == "function") return await e.scrollTo(o, 0), !0;
    } catch {
    }
    try {
      if (typeof e.setProperty == "function") return await e.setProperty("scrollLeft", o), !0;
    } catch {
    }
    try {
      return e.scrollLeft = o, !0;
    } catch {
    }
    return !1;
  }
  async function findScrollParent(e) {
    let n = e;
    for (let o = 0; n && o < 24; o += 1) {
      try {
        let a = 0, r = 0;
        typeof n.getProperty == "function" && (a = Number(await n.getProperty("scrollHeight")) || 0, r = Number(await n.getProperty("clientHeight")) || 0);
        if (!(a > r + 8)) try {
          a = Number(n.scrollHeight) || a, r = Number(n.clientHeight) || r;
        } catch {
        }
        if (a > r + 8 && n !== e) return n;
      } catch {
      }
      try {
        n = typeof n.getParent == "function" ? await n.getParent() : null;
      } catch {
        n = null;
      }
    }
    return null;
  }
  function resolveScrollYPercent(e, n = -1) {
    const o = Number(e?.y_percent ?? e?.anchor_percent ?? e?.read_percent);
    if (Number.isFinite(o)) return Math.max(0, Math.min(100, o));
    const a = (t.overlayUi?.markers || []).find((c) => c.card?.id === e?.id), r = Number(a?.yPercent);
    if (Number.isFinite(r)) return Math.max(0, Math.min(100, r));
    const i = linkedCards(t.selectedMessage) || [], s = n >= 0 ? n : Math.max(0, i.findIndex((c) => c.id === e?.id)), c = Math.max(1, i.length || (t.overlayUi?.markers || []).length || 1);
    return Math.max(0, Math.min(100, Ot(e, s >= 0 ? s : 0, c)));
  }
  async function sleepMs(e) {
    await new Promise((n) => setTimeout(n, Math.max(0, Number(e) || 0)));
  }
  async function bindCardSourceMessage(e, n) {
    if (!e || !n) return !1;
    const o = await dt(await qe(n));
    if (!o.length) return !1;
    const a = await Za().catch(() => null);
    let r = -1;
    for (let i = 0; i < o.length; i += 1) {
      const s = await De(o[i]);
      if (!s) continue;
      const c = qa(s, a?.messages || [], i, o.length);
      if (e.content_hash && ye(c.text || s) === e.content_hash || Number.isFinite(Number(e.message_index)) && Number(c.chatIndex) === Number(e.message_index)) {
        r = i;
        break;
      }
    }
    // Use scroll source so Da does not auto-generate or treat this as a user click.
    return r >= 0 ? Da(r, o, { source: "scroll" }) : !1;
  }
  async function scrollIntoViewSafe(el, opts = {}) {
    if (!el) return !1;
    try {
      if (typeof el.scrollIntoView == "function") {
        await el.scrollIntoView({
          behavior: opts.behavior || "auto",
          block: opts.block || "center",
          inline: opts.inline || "nearest"
        });
        return !0;
      }
    } catch {
    }
    return !1;
  }
  async function pt(e) {
    const n = t.overlayUi?.doc || t.galleryUi?.doc || await ue();
    if (!n || !e) return;
    await bindCardSourceMessage(e, n);
    let o = await Ge(n);
    if (!o) {
      y("warn", "scroll.miss", "선택 메시지 DOM 없음");
      return;
    }
    const a = resolveScrollYPercent(e);
    // 1) Bring the message into view (same idea as lightboard scrollIntoView).
    await scrollIntoViewSafe(o, {
      behavior: "auto",
      block: "center"
    });
    await sleepMs(40);
    async function s() {
      o = await Ge(n) || o;
      const c = await o.getBoundingClientRect();
      if (!c || !(c.height > 1)) return {
        ok: !1,
        delta: 0
      };
      // Align the card's y_percent point to the middle of the scrollport.
      const targetY = c.top + Math.max(1, c.height) * (a / 100);
      const parents = [];
      const sp = await findScrollParent(o);
      if (sp) parents.push(sp);
      const chat = await qe(n);
      if (chat && (!sp || chat !== sp)) parents.push(chat);
      let l = 0, p = !1;
      for (const i of parents) {
        try {
          const m = await i.getBoundingClientRect();
          if (!(m && m.height > 40)) continue;
          const u = targetY - (m.top + m.height * 0.5), b = await getScrollTopSafe(i);
          l = u;
          if (Math.abs(u) < 1.5) {
            p = !0;
            break;
          }
          p = await setScrollTopSafe(i, b + u);
          if (!p && typeof i.scrollBy == "function") try {
            await i.scrollBy({
              top: u,
              behavior: "auto"
            }), p = !0;
          } catch {
          }
          if (p) break;
        } catch {
        }
      }
      if (!p && typeof window < "u") {
        const m = typeof window.innerHeight < "u" && window.innerHeight || 800, u = targetY - m * 0.5;
        l = u, window.scrollBy({
          top: u,
          behavior: "auto"
        }), p = !0;
      }
      return {
        ok: p,
        delta: l
      };
    }
    try {
      let c = await s();
      await sleepMs(50), c = await s(), await sleepMs(50), c = await s(), Ce(), scheduleOverlayPlace(60), y("info", "scroll.toCard", `P${e.paragraph ?? "?"} y=${Math.round(a)}% id=${String(e.id || "").slice(0, 8)} delta=${Math.round(c.delta || 0)}`);
      try {
        if (t.galleryUi?.status && typeof t.galleryUi.status.setTextContent == "function") await t.galleryUi.status.setTextContent(`메시지 ${Math.round(a)}% 위치로 이동`);
      } catch {
      }
    } catch (c) {
      y("warn", "scroll.fail", c?.message || c);
    }
  }
  async function Wt() {
    const e = t.overlayUi;
    if (e?.cancelMobilePress?.(), Va(), await Fe(), await zt(), e?.chatScrollEl && e?.chatScrollId != null && await de(e.chatScrollEl, "scroll", e.chatScrollId), e?.doc && (await de(e.doc, "scroll", e.scrollId), await de(e.doc, "scrollend", e.scrollEndId), await de(e.doc, "pointermove", e.moveId), await de(e.doc, "pointerdown", e.downId), await de(e.doc, "pointerup", e.upId), await de(e.doc, "pointercancel", e.cancelId), await de(e.doc, "keydown", e.keyId), await de(e.doc, "dblclick", e.dblId), await de(e.doc, "click", e.clickId)), e?.body && await de(e.body, "scroll", e.bodyScrollId), e?.winScrollBound && typeof window < "u" && e?.onStickyScroll) {
      try {
        window.removeEventListener("scroll", e.onStickyScroll, !0);
      } catch {
      }
      try {
        window.removeEventListener("scrollend", e.onScrollEnd || e.onStickyScroll, !0);
      } catch {
      }
      try {
        window.removeEventListener("wheel", e.onUserScrollStart || e.onStickyScroll, !0);
      } catch {
      }
      try {
        window.removeEventListener("resize", e.onStickyScroll);
      } catch {
      }
    }
    try {
      t._scrollSettle?.cancel?.();
    } catch {
    }
    t._scrollSettle = null;
    if (t.overlayScrollTimer && (clearTimeout(t.overlayScrollTimer), t.overlayScrollTimer = null), t.overlayRaf != null) {
      if (typeof cancelAnimationFrame == "function") try {
        cancelAnimationFrame(t.overlayRaf);
      } catch {
      }
      try {
        clearTimeout(t.overlayRaf);
      } catch {
      }
      t.overlayRaf = null;
    }
    await rt(Y), t.overlayUi = null;
  }
  async function Ya() {
    if (t.uiOpen) return;
    if (t.overlayUi?.root) {
      await he();
      return;
    }
    const e = await ue();
    if (!e) return;
    const n = await Ee(e);
    if (!n || typeof e.createElement != "function") return;
    const o = await H(e, "div", {
      className: Y,
      style: "position:fixed;left:0;top:0;width:0;height:0;z-index:99970;pointer-events:none;"
    });
    await n.appendChild(o);
    const a = await H(e, "div", { style: "position:fixed;left:0;top:0;width:0;height:0;z-index:99971;pointer-events:none;" });
    await o.appendChild(a);
    const r = await H(e, "div", { style: "position:fixed;display:none;z-index:99992;width:220px;pointer-events:none;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.16);box-shadow:0 16px 40px rgba(0,0,0,.5);background:#0b0f18;" });
    await o.appendChild(r);
    const pinned = await H(e, "div", { style: "position:fixed;display:none;z-index:99997;pointer-events:none;" }), fullscreen = await H(e, "div", { style: "position:fixed;inset:0;display:none;z-index:100001;pointer-events:none;background:rgba(0,0,0,.92);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;" }), actionMenu = await H(e, "div", { style: "position:fixed;inset:0;display:none;z-index:100002;pointer-events:none;background:transparent;align-items:flex-end;justify-content:center;padding:16px;box-sizing:border-box;" }), pressFill = await H(e, "div", { style: "position:fixed;display:none;z-index:99973;pointer-events:none;overflow:hidden;border-radius:8px;" });
    await o.appendChild(pinned), await o.appendChild(fullscreen), await o.appendChild(actionMenu), await o.appendChild(pressFill);
    let pointerGesture = null, mobilePress = null, pinClick = null, actionCard = null, inspectOpen = !1, inspectGuardUntil = 0, pendingSheetHit = null, inspectZones = [], inspectSheetEl = null;
    const PRESS_MS = 420;
    const hidePinned = async () => {
      await pinned.setStyleAttribute("position:fixed;display:none;z-index:99997;pointer-events:none;");
    }, showPinned = async () => {
      await hidePinned();
    }, syncMobileAlways = async () => {
      await hidePinned();
    }, hideFullscreen = async () => {
      await fullscreen.setStyleAttribute("position:fixed;inset:0;display:none;z-index:100001;pointer-events:none;");
    }, hideActionMenu = async () => {
      // pointer-events:none when hidden — inset:0 + auto was able to steal viewer chip clicks.
      actionCard = null, inspectZones = [], inspectSheetEl = null, await actionMenu.setStyleAttribute("position:fixed;inset:0;display:none;z-index:100002;pointer-events:none;");
    }, hideInspect = async () => {
      inspectOpen = !1, pendingSheetHit = null, await hideActionMenu(), await hideFullscreen();
    }, hidePressFill = async () => {
      try {
        await pressFill.setInnerHTML("");
      } catch {
      }
      try {
        await pressFill.setStyleAttribute("position:fixed;display:none;z-index:99973;pointer-events:none;");
      } catch {
      }
    }, ensurePressFillAnim = async () => {
      if (t._nxPressFillAnim) return;
      try {
        const st = await H(e, "style", {
          text: "@keyframes nxPressFill{from{transform:scaleY(0)}to{transform:scaleY(1)}}"
        });
        await o.appendChild(st), t._nxPressFillAnim = !0;
      } catch {
      }
    }, showPressFill = async (thumb) => {
      if (!thumb) return;
      await ensurePressFillAnim();
      let rect = null;
      try {
        rect = await thumb.getBoundingClientRect();
      } catch {
        rect = null;
      }
      if (!rect) return;
      const L = Math.round(rect.left), T = Math.round(rect.top), W = Math.max(1, Math.round(rect.width || rect.right - rect.left)), Hh = Math.max(1, Math.round(rect.height || rect.bottom - rect.top));
      await pressFill.setStyleAttribute(`position:fixed;left:${L}px;top:${T}px;width:${W}px;height:${Hh}px;z-index:99971;pointer-events:none;overflow:hidden;border-radius:8px;display:block;background:transparent`);
      await pressFill.setInnerHTML(`<div style="position:absolute;left:0;right:0;bottom:0;height:100%;background:linear-gradient(180deg,rgba(124,108,255,.12),rgba(124,108,255,.42));transform:scaleY(0);transform-origin:bottom center;animation:nxPressFill ${PRESS_MS}ms linear forwards;pointer-events:none"></div>`);
    }, showFullscreen = async (f) => {
      await fullscreen.setInnerHTML(`<img src="${Ie(f)}" style="display:block;max-width:calc(100vw - 32px);max-height:calc(100dvh - 140px);width:auto;height:auto;object-fit:contain;background:transparent" alt="전체 화면 이미지">`), await fullscreen.setStyleAttribute("position:fixed;inset:0;display:flex;z-index:100001;pointer-events:none;background:rgba(0,0,0,.92);align-items:center;justify-content:center;padding:16px 16px 120px;box-sizing:border-box;");
    }, addInspectBtn = async (parent, label, act, style, charI = -1) => {
      const btn = await H(e, "button", {
        text: label,
        style
      });
      try {
        await btn.setAttribute("type", "button");
        await btn.setAttribute("data-nx-act", act);
        if (charI >= 0) await btn.setAttribute("data-nx-char-i", String(charI));
      } catch {
      }
      await parent.appendChild(btn);
      inspectZones.push({
        el: btn,
        act,
        charI
      });
      return btn;
    }, showStickyInspect = async (f) => {
      if (!f) return;
      await hidePressFill();
      actionCard = f, inspectOpen = !0, pendingSheetHit = null, inspectGuardUntil = Date.now() + 400, inspectZones = [], inspectSheetEl = null;
      await showFullscreen(f);
      try {
        await actionMenu.setInnerHTML("");
      } catch {
      }
      const chipStyle = "border:0;border-radius:999px;padding:7px 11px;font:700 11px Segoe UI,sans-serif;white-space:nowrap;touch-action:manipulation;pointer-events:auto";
      const actStyle = "border:0;border-radius:10px;padding:9px 14px;font:700 12px Segoe UI,sans-serif;white-space:nowrap;touch-action:manipulation;pointer-events:auto";
      const sheet = await H(e, "div", { style: "width:min(440px,100%);background:linear-gradient(165deg,#1a1f2e,#0c1018);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:12px;box-shadow:0 24px 60px rgba(0,0,0,.55);display:grid;gap:10px;pointer-events:auto;" });
      const chipRow = await H(e, "div", { style: "display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;pointer-events:auto;" });
      const actRow = await H(e, "div", { style: "display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;pointer-events:auto;" });
      const closeRow = await H(e, "div", { style: "display:flex;justify-content:center;pointer-events:auto;" });
      await addInspectBtn(chipRow, "base", "base", `${chipStyle};background:rgba(124,108,255,.22);color:#ddd6fe;border:1px solid rgba(124,108,255,.45)`);
      const chars = Array.isArray(f?.characters) ? f.characters : [];
      for (let i = 0; i < chars.length; i += 1) {
        const name = w(chars[i]?.name || "", 40);
        await addInspectBtn(chipRow, `c${i + 1}${name ? `·${name}` : ""}`, "char", `${chipStyle};background:rgba(255,255,255,.06);color:#e8eef8;border:1px solid rgba(255,255,255,.14)`, i);
      }
      await addInspectBtn(actRow, "태그", "retag", `${actStyle};background:rgba(15,118,110,.92);color:#fff`);
      await addInspectBtn(actRow, "재생성", "regen", `${actStyle};background:rgba(124,108,255,.92);color:#fff`);
      await addInspectBtn(actRow, "리롤", "reroll", `${actStyle};background:rgba(51,65,85,.95);color:#e8eef8;border:1px solid rgba(255,255,255,.14)`);
      await addInspectBtn(closeRow, "닫기", "close", `${actStyle};background:rgba(255,255,255,.06);color:#cbd5e1;border:1px solid rgba(255,255,255,.1);min-width:88px`);
      await sheet.appendChild(chipRow), await sheet.appendChild(actRow), await sheet.appendChild(closeRow);
      await actionMenu.appendChild(sheet);
      inspectSheetEl = sheet;
      await actionMenu.setStyleAttribute("position:fixed;inset:0;display:flex;z-index:100002;pointer-events:auto;background:transparent;align-items:flex-end;justify-content:center;padding:max(12px,env(safe-area-inset-bottom)) 12px 18px;box-sizing:border-box;");
    }, findActHit = async (x, I) => {
      for (const z of inspectZones) {
        if (!z?.el) continue;
        try {
          if (await hitEl(z.el, x, I)) return {
            act: z.act,
            charI: z.charI
          };
        } catch {
        }
      }
      if (inspectSheetEl) {
        try {
          if (await hitEl(inspectSheetEl, x, I)) return {
            act: "",
            charI: -1,
            inside: !0
          };
        } catch {
        }
      }
      return null;
    }, runInspectAction = async (act, card, charI = -1) => {
      if (!card || act === "close") {
        await hideInspect();
        return;
      }
      if (act === "base") {
        await hideInspect();
        try {
          await openCardTagEdit(card);
        } catch (err) {
          y("error", "sticky.base.fail", err?.message || err);
        }
        return;
      }
      if (act === "char") {
        await hideInspect();
        try {
          await ensureViewerRosterLoaded().catch(() => null);
          const raw = Array.isArray(card.characters) ? card.characters[charI] : null, name = w(raw?.name || "", 200);
          if (name) await Ua({
            name,
            prompt: w(raw?.prompt || "", 400),
            roster: Dt(name),
            index: charI
          });
          else await openCardTagEdit(card);
        } catch (err) {
          y("error", "sticky.char.fail", err?.message || err);
        }
        return;
      }
      if (act === "reroll") {
        await hideInspect();
        try {
          await withImageRerollToast("이미지 리롤 중…", async () => await K(`/v1/cards/${encodeURIComponent(card.id)}/reroll`, {
            method: "POST",
            body: {
              mode: "nai"
            }
          }, 18e4));
          const W = await Z({
            useOverride: !1
          }).catch(() => null);
          W?.sessionId && await ce(W.sessionId);
          try {
            await he();
          } catch {
          }
        } catch (err) {
          y("error", "sticky.reroll.fail", err?.message || err);
        }
        return;
      }
      if (act === "retag") {
        await hideInspect();
        try {
          const scope = await Z({
            useOverride: !1
          }).catch(() => null), text = w(t.selectedMessage?.text || card.assistant_preview || "", 5e4);
          if (!text || text.length < 8) {
            y("warn", "sticky.retag.skip", "메시지 텍스트 없음");
            return;
          }
          await Be(scope, text, !0);
        } catch (err) {
          y("error", "sticky.retag.fail", err?.message || err);
        }
        return;
      }
      if (act === "regen") {
        await hideInspect();
        try {
          const msg = t.selectedMessage, scope = await Z({
            useOverride: !1
          }).catch(() => null);
          if (!msg && !card) {
            y("warn", "sticky.regen.skip", "재생성할 메시지 없음");
            return;
          }
          const hash = msg?.hash || card.content_hash || "";
          const liveMsg = msg || { hash, sessionId: scope?.sessionId || card.session_id || "", chatIndex: card.message_index };
          if (hash) t.jobsInFlight.set(hash, Date.now());
          try {
            const targets = messageCardsByY(liveMsg);
            await withImageRerollToast(`메시지 이미지 전체 재생성 중… (0/${targets.length || "?"})`, async (report) => rerollMessageImagesLive(liveMsg, {
              scope,
              report,
              onShot: async () => {
                if (t.galleryUi?.renderGal) await t.galleryUi.renderGal();
              }
            }), { shotCount: Math.max(1, targets.length || 1) });
            scope?.sessionId && await ce(scope.sessionId, !0);
            try {
              await he();
            } catch {
            }
          } finally {
            if (hash) t.jobsInFlight.delete(hash);
          }
        } catch (err) {
          y("error", "sticky.regen.fail", err?.message || err);
        }
      }
    }, cancelMobilePress = () => {
      mobilePress?.timer && clearTimeout(mobilePress.timer), mobilePress = null;
      hidePressFill().catch(() => {
      });
    };
    const i = async (f, x, I) => {
      const R = t.overlayUi?.preview || r;
      if (!R) return;
      const id = String(f?.id || ""), g = Ie(f);
      if (t._hoverPreviewCardId !== id) {
        t._hoverPreviewCardId = id;
        await R.setInnerHTML(`<img src="${g}" style="width:100%;max-height:100%;object-fit:contain;display:block" />`);
      }
      t._hoverPreviewXY = {
        x,
        y: I
      };
      if (t._hoverPreviewRaf) return;
      const raf = typeof requestAnimationFrame == "function" ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
      t._hoverPreviewRaf = raf(async () => {
        t._hoverPreviewRaf = 0;
        const xy = t._hoverPreviewXY;
        if (!xy || !hoverPreviewOn()) return;
        try {
          await R.setStyleAttribute(Ca(220, xy.x, xy.y));
        } catch {
        }
      });
    }, s = async () => {
      const f = t.overlayUi?.preview || r;
      t._hoverPreviewCardId = "", t._hoverPreviewXY = null;
      if (t._hoverPreviewRaf && typeof cancelAnimationFrame == "function") try {
        cancelAnimationFrame(t._hoverPreviewRaf);
      } catch {
      }
      t._hoverPreviewRaf = 0, f && await f.setStyleAttribute("position:fixed;display:none;z-index:99996;width:220px;pointer-events:none;");
    }, c = async (f, x, I) => {
      try {
        const R = await f.el.getBoundingClientRect(), g = Number(f.hitPad) || 8;
        return x >= R.left - g && x <= R.right + g && I >= R.top - g && I <= R.bottom + g;
      } catch {
        return !1;
      }
    }, l = async (f) => {
      if (typeof f?.clientX == "number") t._pointerClientX = f.clientX;
      if (typeof f?.clientY == "number") t._pointerClientY = f.clientY;
      if (t.uiOpen || t._hostChromeBlocked) return;
      if (pointerGesture && typeof f.clientX == "number" && typeof f.clientY == "number") {
        pointerGesture.movement = Math.max(pointerGesture.movement || 0, Math.hypot(f.clientX - pointerGesture.x, f.clientY - pointerGesture.y));
      }
      if (mobilePress && typeof f.clientX == "number" && typeof f.clientY == "number" && Math.hypot(f.clientX - mobilePress.x, f.clientY - mobilePress.y) > 8) cancelMobilePress();
      const x = t.overlayUi?.markers || [];
      if (!x.length || !hoverPreviewOn()) {
        await s();
        return;
      }
      const I = f.clientX, R = f.clientY;
      if (!(typeof I != "number" || typeof R != "number")) {
        for (const g of x.filter((F) => F.active || F.mini)) if (await c(g, I, R)) {
          await i(g.card, I, R);
          return;
        }
        await s();
      }
    }, p = async (f) => {
      if (typeof f?.clientX == "number") t._pointerClientX = f.clientX;
      if (typeof f?.clientY == "number") t._pointerClientY = f.clientY;
      if (t.uiOpen || t._hostChromeBlocked || t.charEditUi) return;
      const x = f.clientX, I = f.clientY;
      if (typeof x != "number" || typeof I != "number") return;
      // Middle-click message jump removed (never reliable on host SafeDOM).
      if (Number(f?.button) != null && Number(f.button) !== 0) return;
      if (mobilePress && f.pointerId != null && mobilePress.pointerId != null && f.pointerId !== mobilePress.pointerId) {
        cancelMobilePress();
        return;
      }
      if (inspectOpen && await hitEl(actionMenu, x, I)) {
        cancelMobilePress();
        if (Date.now() < inspectGuardUntil) {
          pendingSheetHit = {
            kind: "guard"
          };
          return;
        }
        try {
          const hit = await findActHit(x, I);
          if (hit?.act) {
            pendingSheetHit = {
              kind: "act",
              act: hit.act,
              charI: hit.charI
            };
            return;
          }
          if (hit?.inside) {
            pendingSheetHit = {
              kind: "inside"
            };
            return;
          }
        } catch {
        }
        pendingSheetHit = {
          kind: "outside"
        };
        return;
      }
      // Sticky always-image: short-tap hide / long-press fullscreen+sheet.
      if (Nt() && !inspectOpen) {
        const stickyMarkers = t.overlayUi?.markers || [];
        for (const g of stickyMarkers) {
          if (!g?.active || !g.thumb || t.overlayUi?._stickyThumbCollapsed) continue;
          if (!await hitEl(g.thumb, x, I)) continue;
          if (mobilePress) {
            cancelMobilePress();
            return;
          }
          const F = {
            x,
            y: I,
            card: g.card,
            source: "sticky-thumb",
            pointerId: f.pointerId,
            long: !1,
            timer: null,
            thumb: g.thumb
          };
          showPressFill(g.thumb).catch(() => {
          });
          F.timer = setTimeout(() => {
            if (mobilePress !== F) return;
            F.long = !0;
            showStickyInspect(F.card).catch(() => {
            });
          }, PRESS_MS), mobilePress = F;
          return;
        }
      }
      const R = t.overlayUi?.markers || [];
      for (const g of R) if (await c(g, x, I)) {
        pointerGesture = {
          x,
          y: I,
          movement: 0,
          marker: !0
        };
        // Sticky image hidden → pin short-tap revives it.
        if (Nt() && t.overlayUi?._stickyThumbCollapsed) {
          if (mobilePress) {
            cancelMobilePress();
            return;
          }
          const F = {
            x,
            y: I,
            card: g.card,
            source: "sticky-pin",
            pointerId: f.pointerId,
            long: !1,
            timer: null
          };
          F.timer = setTimeout(() => {
            if (mobilePress === F) F.long = !0;
          }, 420), mobilePress = F;
          return;
        }
        // Click sticky pin opens viewer.
        pinClick = {
          card: g.card,
          pointerId: f.pointerId
        };
        return;
      }
      if (await excludedMessageTarget(e, x, I)) {
        pointerGesture = null;
        return;
      }
      pointerGesture = {
        x,
        y: I,
        movement: 0,
        marker: !1,
        forClick: clickTrackEnabled(),
        forText: textDragSelectEnabled()
      };
    }, onClick = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) return;
      const x = f.clientX, I = f.clientY, R = t._lastPointerGesture || pointerGesture;
      t._lastPointerGesture = null, pointerGesture = null;
      if (!R || R.marker || !R.forClick || typeof x != "number" || typeof I != "number") return;
      const g = Math.max(R.movement || 0, Math.hypot(x - R.x, I - R.y));
      if (g > 8 || await excludedMessageTarget(e, x, I)) return;
      const gesture = messageSelectGesture(), detail = Number(f.detail || 1), VC = globalThis.__INLAY_VIEWER_CORE__, resolve = VC?.resolveClickSelectionAction;
      let action = "confirm";
      if (typeof resolve == "function") {
        const decision = resolve({
          gesture,
          detail,
          pendingDomIndex: t._pendingSelectDom,
          targetDomIndex: null
        });
        if (decision.action === "ignore") return;
        action = decision.action;
      } else if (gesture === "double") {
        if (detail === 1) action = "provisional";
        else if (detail !== 2) return;
      } else if (detail !== 1) return;
      const a = await dt(await qe(e));
      if (!a.length) return;
      let r = await Oa(e, x, I, a);
      if (r === -2) return;
      r < 0 && (r = await Ra(x, I, a));
      if (r < 0) return;
      if (action === "provisional") {
        t._pendingSelectDom = r, await Da(r, a, { source: "provisional" });
        return;
      }
      t._pendingSelectDom = null, await Da(r, a, { source: "click" });
    }, onPointerUp = async (f) => {
      if (t.uiOpen || t._hostChromeBlocked) {
        cancelMobilePress(), pinClick = null, pointerGesture = null, pendingSheetHit = null;
        return;
      }
      if (inspectOpen) {
        const hit = pendingSheetHit;
        pendingSheetHit = null;
        if (Date.now() < inspectGuardUntil || hit?.kind === "guard") return;
        if (hit?.kind === "act" && hit.act) {
          await runInspectAction(hit.act, actionCard, hit.charI);
          return;
        }
        if (hit?.kind === "outside") {
          await hideInspect();
          return;
        }
        // inside sheet / empty control: keep open
        if (hit?.kind === "inside" || hit?.inside || hit?.kind === "act") return;
      }
      if (pinClick) {
        const click = pinClick;
        pinClick = null;
        const card = click.card, F = Math.max(0, (t.gallery || []).findIndex((T) => T.id === card?.id));
        t.viewerIndex = F, t.galleryUi || await lt(), t.galleryUi && (t.galleryUi.index = F, typeof t.galleryUi.setOpen == "function" && await t.galleryUi.setOpen(!0)), y("info", "marker.click", `P${card?.paragraph} id=${(card?.id || "").slice(0, 8)} · middle-click to scroll`);
        return;
      }
      const gest = pointerGesture;
      pointerGesture = null;
      t._lastPointerGesture = gest;
      if (gest && !gest.marker && gest.forText) {
        const VC = globalThis.__INLAY_VIEWER_CORE__, check = VC?.shouldSelectMessageByTextDrag, hasSel = await hasTextSelection(e), ok = typeof check == "function" ? check({
          enabled: !0,
          movement: gest.movement || 0,
          hasSelection: hasSel,
          excludedTarget: !1
        }) : hasSel && (gest.movement || 0) > 8;
        if (ok) {
          const x = typeof f?.clientX == "number" ? f.clientX : gest.x, I = typeof f?.clientY == "number" ? f.clientY : gest.y;
          if (!(await excludedMessageTarget(e, x, I))) {
            t._lastPointerGesture = null, await Fa(e, x, I, { source: "text" });
            return;
          }
        }
      }
      const fPress = mobilePress;
      if (!fPress) return;
      fPress.timer && clearTimeout(fPress.timer), mobilePress = null;
      if (fPress.long) {
        await hidePressFill();
        return;
      }
      if (fPress.source === "sticky-thumb") {
        await hidePressFill();
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbCollapsed = !ov._stickyThumbCollapsed;
        try {
          await Ht();
        } catch {
        }
        y("info", ov?._stickyThumbCollapsed ? "sticky.thumb.hide" : "sticky.thumb.show", String(fPress.card?.id || "").slice(0, 8));
        return;
      }
      if (fPress.source === "sticky-pin") {
        const ov = t.overlayUi;
        if (ov) ov._stickyThumbCollapsed = !1;
        try {
          await Ht();
        } catch {
        }
        y("info", "sticky.thumb.revive", String(fPress.card?.id || "").slice(0, 8));
      }
    }, onPointerCancel = () => {
      cancelMobilePress(), pointerGesture = null, pinClick = null, pendingSheetHit = null;
    }, m = async () => {
      // Message scroll is middle-click now — ignore dblclick.
    }, u = () => {
      if (t.uiOpen) return;
      // Capture native scrollY synchronously — SafeDOM rects are too slow for sticky image swaps.
      try {
        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;
      } catch {
      }
      stickyFlashOnScroll();
      // Scroll path: coalesce full sticky correct to 1 rAF; select only after short idle.
      scheduleStickySync(), scheduleScrollTrack();
    }, onScrollEnd = () => {
      if (t.uiOpen) return;
      try {
        if (typeof window < "u" && t.overlayUi) t.overlayUi._liveScrollY = window.scrollY || window.pageYOffset || 0;
      } catch {
      }
      // End of gesture: correct with a real pin rect (not just the estimate).
      scheduleStickySync(!0), settleScrollTrackNow();
    }, onUserScrollStart = u, b = await fe(n, "scroll", u, !0), C = await fe(e, "scroll", u, !0), S = await fe(e, "scrollend", onScrollEnd, !0);
    let E = !1;
    if (typeof window < "u") try {
      window.addEventListener("scroll", u, !0), window.addEventListener("scrollend", onScrollEnd, !0), window.addEventListener("wheel", onUserScrollStart, {
        capture: !0,
        passive: !0
      }), window.addEventListener("resize", u), E = !0;
    } catch {
      try {
        window.addEventListener("scroll", u), window.addEventListener("wheel", onUserScrollStart), window.addEventListener("resize", u), E = !0;
      } catch {
      }
    }
    const j = await fe(e, "pointermove", l), d = await fe(e, "pointerdown", p), U = null, clickId = await fe(e, "click", onClick), upId = await fe(e, "pointerup", onPointerUp), cancelId = await fe(e, "pointercancel", onPointerCancel), keyId = await fe(e, "keydown", async (f) => {
      if (f.key === "Escape" || f.code === "Escape") await hideInspect();
    });
    t.overlayUi = {
      doc: e,
      root: o,
      layer: a,
      preview: r,
      pinned,
      fullscreen,
      actionMenu,
      markers: [],
      scrollId: C,
      scrollEndId: S,
      bodyScrollId: b,
      moveId: j,
      downId: d,
      dblId: U,
      clickId,
      upId,
      cancelId,
      keyId,
      body: n,
      showPreview: i,
      hidePreview: s,
      showPinned,
      hidePinned,
      syncMobileAlways,
      pinTarget: null,
      edgeHint: null,
      _stickyThumbCollapsed: !1,
      _stickyEditorOpen: !1,
      onStickyScroll: u,
      onScrollEnd,
      onUserScrollStart,
      cancelMobilePress,
      chatScrollEl: null,
      chatScrollId: null,
      extraScrollBindings: [],
      segmentWatchId: null,
      winScrollBound: E
    }, Gt(), y("info", "overlay.ready", "메시지 클릭 · 스크롤 구간"), await he();
  }
  async function Ka(e, n) {
    if (!e || e.length < 8 || t.jobsInFlight.has(n) || !(await ve()).enabled) return;
    if (ge(n).length) return;
    try {
      await le();
    } catch {
    }
    const o = t.backendSettings?.card || {};
    if (o.power === !1 || o.execute === "manual") return;
    const a = await Z({ useOverride: !1 }).catch(() => null);
    if (!a || a.charIndex < 0) return;
    const rebound = await maybeRebindAndLink({
      hash: n,
      text: e,
      characterId: t.selectedMessage?.characterId || a.characterId,
      chatId: t.selectedMessage?.chatId || a.chatId,
      sessionId: t.selectedMessage?.sessionId || a.sessionId,
      chatIndex: t.selectedMessage?.chatIndex ?? -1,
      messageIndex: t.selectedMessage?.chatIndex ?? -1,
      role: t.selectedMessage?.role || "char"
    }, a);
    if (rebound.length) return y("info", "overlay.generate.skip", `rebound hash=${n.slice(0, 8)} cards=${rebound.length}`);
    y("info", "overlay.generate", `hash=${n.slice(0, 8)} chars=${e.length} session=${(a.sessionId || "").slice(-8)}`), await Be(a, e, !1);
  }
  async function Ja() {
    if (t.uiOpen || t._hostChromeBlocked) return;
    const e = t.overlayUi;
    if (!e?.layer) return;
    const n = e.doc || await ue();
    if (!n) return;
    const o = await qe(n), i = Pt, s = [], l = t.selectedMessage, m = [];
    // Skip scanning every visible message — that was the main lag source.
    // Markers only need the currently selected message + its linked cards.
    const a = await getCachedMsgEls(n);
    if (l?.sessionId && t.lastScope?.sessionId && l.sessionId !== t.lastScope.sessionId) {
      t.selectedMessage = null, t.lastImagedMessage = null, await Fe(), t.debugInsight = {
        at: Date.now(),
        focus: null,
        messages: m,
        markers: [],
        lastPlace: "selection cleared (session changed)"
      }, t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), y("info", "overlay.place", "세션 변경 · 선택 해제");
      return;
    }
    // No selection: keep existing sticky (do not wipe).
    if (!l) {
      if (e.markers?.length) {
        await Ht();
        y("info", "overlay.place", `keep sticky · no-selection markers=${e.markers.length}`);
        return;
      }
      t.debugInsight = {
        at: Date.now(),
        focus: null,
        messages: m,
        markers: [],
        lastPlace: "no-selection (click a message)"
      }, t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), y("info", "overlay.place", "대기: 메시지 클릭 필요");
      return;
    }
    let u = null, b = null, C = l.text;
    if (l.domIndex >= 0 && l.domIndex < (a || []).length && (u = a[l.domIndex]), u || (u = await Ge(n)), u) try {
      b = await u.getBoundingClientRect();
    } catch {
    }
    // DOM missing: keep previous sticky if any.
    if (!u || !b) {
      if (e.markers?.length) {
        await Ht();
        y("warn", "overlay.place", `DOM#${l.domIndex} 없음 · sticky keep ${e.markers.length}`);
        return;
      }
      t.debugInsight = {
        at: Date.now(),
        focus: null,
        messages: m,
        markers: [],
        lastPlace: `selected DOM#${l.domIndex} missing`
      }, y("warn", "overlay.place", `선택 메시지 DOM#${l.domIndex} 없음`), t.debugUi?.refreshSoon && t.debugUi.refreshSoon();
      return;
    }
    try {
      const g = await De(u);
      g && (C = g);
    } catch {
    }
    const focus = stickyFocusMessage() || l;
    let S = linkedCards(focus), E = l.matchMode || "none";
    const liveLinked = linkedCards(l);
    ge(l.hash).length || liveLinked.length ? E = "hash" : S.length ? E = "lastImaged" : E = "none";
    const j = Xt(C || l.text), d = j.length ? j : [C || l.text || ""], U = Me(S), f = resolvePinLeftX(), x = Math.max(1, U.length || e.markers?.length || 1);
    // Reading% pin target = message that owns the sticky cards (focus), not empty selection.
    let pinEl = u, pinMsg = l;
    if (focus && (focus.hash !== l.hash || Number(focus.domIndex) !== Number(l.domIndex))) {
      pinMsg = focus;
      pinEl = null;
      if (focus.domIndex >= 0 && focus.domIndex < (a || []).length) pinEl = a[focus.domIndex];
      if (!pinEl) pinEl = await resolveMessageDom(n, focus);
    }
    e.pinTarget = pinEl || u, e._pinDomIndex = Number((pinEl ? pinMsg : l).domIndex), await Wa(o);
    // No images for focus: keep previous markers (never blank sticky).
    if (!U.length) {
      if (e.markers?.length) {
        l.hasImage = liveLinked.length > 0, l.cardCount = liveLinked.length, l.matchMode = E, t.selectedMessage = l;
        await Ht();
        y("info", "overlay.place", `keep sticky · no cards on focus · markers=${e.markers.length}`);
        return;
      }
      y("info", "overlay.place", "no cards yet · sticky idle");
      return;
    }
    // Same card set: refresh y% + pin target only (no wipe / no flicker).
    if (stickyCardKey(U) === stickyMarkerKey(e.markers) && e.markers.length) {
      const slots = Math.max(1, U.length);
      const byId = /* @__PURE__ */ new Map(U.map((c, idx) => [String(c.id), { card: c, ci: idx }]));
      for (const mk of e.markers) {
        const hit = byId.get(String(mk.card?.id));
        if (!hit) continue;
        mk.card = hit.card, mk.yPercent = Ot(hit.card, hit.ci, slots), mk.paragraph = hit.card?.paragraph, mk.line = hit.ci;
        try {
          const fresh = Ie(hit.card);
          if (typeof fresh == "string" && /^data:image\//i.test(fresh) && fresh !== mk._thumbSrc) mk._thumbSrc = fresh;
        } catch {
        }
      }
      e.markers.sort((A, B) => (Number(A.yPercent) || 0) - (Number(B.yPercent) || 0) || (Number(A.line) || 0) - (Number(B.line) || 0));
      l.hasImage = liveLinked.length > 0, l.cardCount = liveLinked.length, l.paragraphsWithImages = [...new Set(liveLinked.map((g) => g.paragraph))].sort((g, F) => Number(g) - Number(F)), l.matchMode = E, l.paragraphCount = d.length, t.selectedMessage = l;
      e._syncedViewerCardId = "";
      await Ht();
      warmStickyMarkerImages(U, focus || l);
      y("info", "overlay.place", `reuse sticky · DOM#${l.domIndex} markers=${e.markers.length} match=${E}`);
      return;
    }
    // Optimistic sticky swap: build nodes from sync cache / previous thumbs first,
    // warm bytes in the background, then refresh srcs (old sticky stays until Ht).
    const prevMarkers = e.markers || [];
    const srcById = /* @__PURE__ */ new Map();
    for (const card of U) {
      try {
        const fb = Ie(card);
        if (typeof fb == "string" && /^data:image\//i.test(fb)) srcById.set(String(card.id), fb);
      } catch {
      }
      if (!srcById.has(String(card.id))) {
        const old = prevMarkers.find((m) => String(m?.card?.id) === String(card.id));
        if (old?._thumbSrc) srcById.set(String(card.id), old._thumbSrc);
      }
    }
    const R = U.map((g, F) => ({
      card: g,
      ci: F,
      yPercent: Ot(g, F, x)
    })).sort((g, F) => g.yPercent - F.yPercent || g.ci - F.ci);
    for (let g = 0; g < R.length; g += 1) {
      const { card: F, ci: T, yPercent: v } = R[g];
      let src = srcById.get(String(F.id)) || "";
      if (!src) {
        try {
          const fb = Ie(F);
          if (typeof fb == "string" && /^data:image\//i.test(fb)) src = fb;
        } catch {
        }
      }
      // Prefer previous thumb src if cache miss — avoid empty flash.
      if (!src) {
        const old = prevMarkers.find((m) => String(m?.card?.id) === String(F.id));
        if (old?._thumbSrc) src = old._thumbSrc;
      }
      const pooled = takePooledMarker(F, src);
      if (pooled) {
        pooled.paragraph = F.paragraph, pooled.yPercent = v, pooled.line = T, pooled.active = !1, pooled.edge = null;
        if (src && !pooled._thumbSrc) pooled._thumbSrc = src, pooled._paintedSrc = src, pooled._thumbHtmlId = String(F.id || "");
        s.push(pooled);
        continue;
      }
      const X = await H(n, "div", {
        style: "position:fixed;display:none;z-index:99970;",
        html: src ? `<img src="${src}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent" />` : `<div style="width:100%;height:100%;background:transparent"></div>`
      });
      await e.layer.appendChild(X);
      const te = await H(n, "div", {
        style: ze(f, -9999, i, !1),
        html: "🖼"
      });
      try {
        await te.setAttribute("data-inlay-role", "marker");
      } catch {
      }
      try {
        await te.setAttribute("x-inlay-role", "marker");
      } catch {
      }
      try {
        await te.setAttribute("title", `P${F.paragraph ?? T} · ${Math.round(v)}%`);
      } catch {
      }
      await e.layer.appendChild(te), s.push({
        el: te,
        thumb: X,
        card: F,
        paragraph: F.paragraph,
        yPercent: v,
        active: !1,
        edge: null,
        line: T,
        hitPad: 12,
        _thumbSrc: src || "",
        _paintedSrc: src || "",
        _thumbHtmlId: src ? String(F.id || "") : "",
        _pinHtml: "🖼"
      });
    }
    // Keep previous thumbs visible until Ht paints the new active image on top.
    e.markers = s;
    e.pinTarget = u;
    e._syncedViewerCardId = "";
    e._lastStickyThumbHtmlId = null;
    await Ht();
    warmStickyMarkerImages(U, focus || l);
    // Background warm: fill missing sticky thumbs without blocking the first paint.
    Promise.all(U.map(async (card) => {
      try {
        const src = await ensureStickyCardImage(card);
        if (!src) return;
        const mk = (e.markers || []).find((m) => String(m?.card?.id) === String(card.id));
        if (!mk) return;
        if (mk._thumbSrc !== src) {
          mk._thumbSrc = src;
          mk.card = card;
          if (mk._thumbHtmlId === String(card.id || "")) {
            mk._paintedSrc = "";
            mk._thumbHtmlId = "";
          }
        }
      } catch {
      }
    })).then(() => Ht()).catch(() => {
    });
    const keepIds = new Set(s.map((m) => String(m?.card?.id || "")).filter(Boolean));
    parkMarkersToPool(prevMarkers.filter((m) => !keepIds.has(String(m?.card?.id || ""))));
    l.hasImage = liveLinked.length > 0, l.cardCount = liveLinked.length, l.paragraphsWithImages = [...new Set(liveLinked.map((g) => g.paragraph))].sort((g, F) => Number(g) - Number(F)), l.matchMode = E, l.paragraphCount = d.length, t.selectedMessage = l, t.debugInsight = {
      at: Date.now(),
      focus: {
        domIndex: l.domIndex,
        chatIndex: l.chatIndex,
        hash: l.hash,
        hasImage: l.hasImage,
        cardCount: l.cardCount,
        paragraphsWithImages: l.paragraphsWithImages,
        matchMode: E,
        preview: l.preview
      },
      messages: m,
      markers: s.map((g) => ({
        paragraph: g.paragraph,
        line: g.line,
        id: g.card?.id,
        yPercent: g.yPercent,
        active: !!g.active,
        hash: g.card?.content_hash
      })),
      lastPlace: `DOM#${l.domIndex} slots=${x} x=${f} markers=${s.length} match=${E} mode=y% pin=segment active=${e.activeSegment ?? -1} y=[${R.map((g) => Math.round(g.yPercent)).join(",")}]`
    }, t.debugUi?.refreshSoon && t.debugUi.refreshSoon(), t.galleryUi?.renderGal && await t.galleryUi.renderGal(), y("info", "overlay.place", t.debugInsight.lastPlace);
  }
  async function he() {
    return Ia.run(Ja);
  }
  async function Vt() {
    try {
      await le();
    } catch {
    }
    const e = t.backendSettings?.card || {};
    e.floating_viewer === !1 && (await flushSettingsSave(), await pe({ card: {
      ...e,
      floating_viewer: !0,
      gallery_fab: !1
    } })), await lt(), t.galleryUi?.renderGal && await t.galleryUi.renderGal();
  }
  async function Xa() {
    await Wt();
  }
  async function Qa() {
    await ve();
    try {
      await le();
    } catch {
    }
    typeof k.registerSetting == "function" && await D("registerSetting", () => k.registerSetting("Inlay Nexus", At, "🖼️", "html", "inlay-nexus-settings"), null), await syncQuickSettingsButton((t.backendSettings?.card || {}).show_risu_settings_button !== !1), await Rt();
    const retryHostUi = async (e = 0) => {
      if (t.unloading || t.uiOpen) return;
      try {
        t.hostDoc = null, await le(), await it();
      } catch (n) {
        e >= 24 && Pe("host ui init", n);
      }
      const n = t.backendSettings?.card || {}, o = n.floating_viewer === !1 || !!t.galleryUi?.root, a = n.overlay_markers === !1 || !!t.overlayUi?.root;
      if (o && a || e >= 24 || t.unloading) return;
      t.startupRetryTimer && clearTimeout(t.startupRetryTimer), t.startupRetryTimer = setTimeout(() => {
        t.startupRetryTimer = null, retryHostUi(e + 1).catch(() => {
        });
      }, Math.min(1500, 120 + e * 80));
    };
    try {
      await retryHostUi();
    } catch (e) {
      Pe("host ui init", e);
    }
    startHostUiWatchdog();
    try {
      if ((typeof k.requestPluginPermission == "function" ? await k.requestPluginPermission("replacer") : !0) === !1) throw new Error("replacer permission denied");
      if (typeof k.addRisuReplacer != "function") throw new Error("addRisuReplacer unavailable");
      await k.addRisuReplacer("afterRequest", _t), t.replacerReady = !0;
    } catch (e) {
      t.replacerReady = !1, t.replacerError = z(e?.message || e), Pe("replacer init failed", e);
    }
    typeof k.onUnload == "function" && k.onUnload(async () => {
      t.unloading = !0, t.pollTimer && clearInterval(t.pollTimer), t.startupRetryTimer && clearTimeout(t.startupRetryTimer), t._pinBootTimer && clearTimeout(t._pinBootTimer), t._hostWatch && clearInterval(t._hostWatch), t._settingsWatch && clearInterval(t._settingsWatch), t.timersBySession.forEach((e) => clearTimeout(e)), await flushSettingsSave().catch(() => {
      }), await syncQuickSettingsButton(!1), await Rt(), await st(), await Xa(), await ct(), await D("removeAfter", () => k.removeRisuReplacer?.("afterRequest", _t), null);
    }), globalThis.INLAY_NEXUS_RUNTIME = t, y("info", "boot", `v${He}`), console.log(`[${$}] ready v${He}`);
  }
  await Qa();
}
console.log(`[${ea}] boot (${Zt})`);
await gn();

