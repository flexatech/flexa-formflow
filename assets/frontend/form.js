/**
 * Flexa FormFlow frontend submit. Plain JS, no build step, multi-instance
 * safe: every .flexa-formflow-form on the page is wired independently.
 */
( function () {
	'use strict';

	var config = window.flexaFormFlowFront || {};
	var text = config.i18n || {};
	// How long a provider script gets to load before the widget offers a retry.
	var SCRIPT_TIMEOUT = 15000;

	/*
	 * CAPTCHA adapters: one per provider, the same four calls each. A form keeps
	 * its own widget id and token, so several forms (and providers) can share a
	 * page without touching each other.
	 */
	var adapters = {
		turnstile: {
			ready: function () {
				return !! ( window.turnstile && window.turnstile.render );
			},
			render: function ( el, state, form ) {
				return window.turnstile.render( el, {
					sitekey: state.sitekey,
					action: 'flexa_formflow_submit',
					cdata: form.dataset.uuid,
					callback: function ( token ) {
						state.token = token;
						hideCaptchaStatus( state );
					},
					'expired-callback': function () {
						state.token = '';
					},
					'error-callback': function () {
						state.token = '';
						showCaptchaStatus( state, text.widgetFailed );
						return true;
					},
				} );
			},
			reset: function ( id ) {
				window.turnstile.reset( id );
			},
		},
		recaptcha_v2: {
			ready: function () {
				return !! ( window.grecaptcha && window.grecaptcha.render );
			},
			render: function ( el, state ) {
				return window.grecaptcha.render( el, {
					sitekey: state.sitekey,
					callback: function ( token ) {
						state.token = token;
						hideCaptchaStatus( state );
					},
					'expired-callback': function () {
						state.token = '';
					},
					'error-callback': function () {
						state.token = '';
						showCaptchaStatus( state, text.widgetFailed );
					},
				} );
			},
			reset: function ( id ) {
				window.grecaptcha.reset( id );
			},
		},
	};

	function showCaptchaStatus( state, message ) {
		state.message.textContent = message || '';
		state.status.hidden = false;
	}

	function hideCaptchaStatus( state ) {
		state.status.hidden = true;
		state.message.textContent = '';
	}

	// Wait for the provider's global; on timeout, offer a retry that loads the
	// script again (a blocked or failed request never leaves the form hanging).
	function whenReady( adapter, done, fail ) {
		var started = Date.now();
		( function poll() {
			if ( adapter.ready() ) {
				done();
			} else if ( Date.now() - started > SCRIPT_TIMEOUT ) {
				fail();
			} else {
				window.setTimeout( poll, 200 );
			}
		} )();
	}

	function reloadScript( src ) {
		var script = document.createElement( 'script' );
		script.src = src;
		script.async = true;
		document.head.appendChild( script );
	}

	function initCaptcha( form ) {
		var el = form.querySelector( '.flexa-formflow-captcha[data-sitekey]' );
		if ( ! el ) {
			return null;
		}
		var state = {
			provider: el.dataset.provider,
			sitekey: el.dataset.sitekey,
			adapter: adapters[ el.dataset.provider ],
			widget: el.querySelector( '.flexa-formflow-captcha__widget' ),
			status: el.querySelector( '.flexa-formflow-captcha__status' ),
			message: el.querySelector( '.flexa-formflow-captcha__message' ),
			retry: el.querySelector( '.flexa-formflow-captcha__retry' ),
			id: null,
			token: '',
			unavailable: el.dataset.unavailable === '1' || ! adapters[ el.dataset.provider ],
		};

		if ( state.unavailable ) {
			state.retry.hidden = true;
			showCaptchaStatus( state, text.unavailable );
			return state;
		}

		function mount() {
			whenReady(
				state.adapter,
				function () {
					if ( state.id === null ) {
						state.id = state.adapter.render( state.widget, state, form );
					}
				},
				function () {
					showCaptchaStatus( state, text.loadFailed );
				}
			);
		}

		state.retry.addEventListener( 'click', function () {
			hideCaptchaStatus( state );
			if ( state.id !== null ) {
				resetCaptcha( state );
				return;
			}
			if ( ! state.adapter.ready() && el.dataset.script ) {
				reloadScript( el.dataset.script );
			}
			mount();
		} );

		mount();
		return state;
	}

	// Tokens are single-use: after any answer from the server, get a fresh one.
	function resetCaptcha( state ) {
		state.token = '';
		if ( state.id !== null ) {
			try {
				state.adapter.reset( state.id );
			} catch ( e ) {
				// A widget the provider already tore down: nothing to reset.
			}
		}
	}

	function collect( form ) {
		var fields = {};
		form.querySelectorAll( '[name]' ).forEach( function ( input ) {
			var name = input.name;
			if ( name === 'ff_website' || name === '_ff_ts' || name.indexOf( 'cf-turnstile' ) === 0 || name.indexOf( 'g-recaptcha' ) === 0 ) {
				return;
			}
			if ( input.type === 'checkbox' ) {
				if ( ! fields[ name ] ) {
					fields[ name ] = [];
				}
				if ( input.checked ) {
					fields[ name ].push( input.value );
				}
			} else if ( input.type === 'radio' ) {
				if ( ! ( name in fields ) ) {
					fields[ name ] = '';
				}
				if ( input.checked ) {
					fields[ name ] = input.value;
				}
			} else {
				fields[ name ] = input.value;
			}
		} );
		return fields;
	}

	function clearErrors( form ) {
		form.querySelectorAll( '.flexa-formflow-error' ).forEach( function ( el ) {
			el.hidden = true;
			el.textContent = '';
		} );
		form.querySelectorAll( '.flexa-formflow-field--invalid' ).forEach( function ( el ) {
			el.classList.remove( 'flexa-formflow-field--invalid' );
		} );
	}

	function showErrors( form, errors ) {
		Object.keys( errors ).forEach( function ( fieldId ) {
			var slot = form.querySelector( '[data-error-for="' + fieldId + '"]' );
			var wrap = form.querySelector( '[data-field="' + fieldId + '"]' );
			if ( slot ) {
				slot.textContent = errors[ fieldId ];
				slot.hidden = false;
			}
			if ( wrap ) {
				wrap.classList.add( 'flexa-formflow-field--invalid' );
			}
		} );
		var first = form.querySelector( '.flexa-formflow-field--invalid' );
		if ( first ) {
			first.scrollIntoView( { behavior: 'smooth', block: 'center' } );
		}
	}

	function wire( form ) {
		var captcha = initCaptcha( form );
		// Interaction signal for the server's timing check: a person typing,
		// clicking or autofilling produces these; a script posting directly does not.
		var interactions = 0;
		[ 'input', 'keydown', 'pointerdown', 'change' ].forEach( function ( type ) {
			form.addEventListener( type, function () {
				interactions++;
			}, true );
		} );

		form.addEventListener( 'submit', function ( event ) {
			event.preventDefault();
			if ( form.dataset.pending === '1' || ! config.restUrl ) {
				return;
			}

			clearErrors( form );
			var button = form.querySelector( '.flexa-formflow-submit' );
			var message = form.querySelector( '.flexa-formflow-message' );
			var honeypot = form.querySelector( '[name="ff_website"]' );
			var timestamp = form.querySelector( '[name="_ff_ts"]' );

			if ( captcha && captcha.unavailable ) {
				showCaptchaStatus( captcha, text.unavailable );
				return;
			}
			if ( captcha && ! captcha.token ) {
				showCaptchaStatus( captcha, text.verify );
				captcha.widget.scrollIntoView( { behavior: 'smooth', block: 'center' } );
				return;
			}

			form.dataset.pending = '1';
			if ( button ) {
				button.disabled = true;
			}

			fetch( config.restUrl + form.dataset.uuid, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify( {
					fields: collect( form ),
					ff_website: honeypot ? honeypot.value : '',
					_ff_ts: timestamp ? parseInt( timestamp.value, 10 ) : 0,
					_ff_i: interactions,
					captcha_token: captcha ? captcha.token : '',
				} ),
			} )
				.then( function ( response ) {
					return response.json().then( function ( body ) {
						return { ok: response.ok, body: body };
					} );
				} )
				.then( function ( result ) {
					if ( captcha ) {
						resetCaptcha( captcha );
					}
					if ( result.ok ) {
						var success = document.createElement( 'p' );
						success.className = 'flexa-formflow-success';
						success.setAttribute( 'role', 'status' );
						success.textContent = result.body.message || '';
						form.replaceWith( success );
						return;
					}
					var data = result.body.data || {};
					if ( data.errors ) {
						showErrors( form, data.errors );
					}
					// A failed verification: keep everything typed, show the
					// reason next to the widget and let the visitor verify again.
					if ( captcha && data.captcha ) {
						showCaptchaStatus( captcha, result.body.message || text.widgetFailed );
						captcha.retry.hidden = data.retry === false;
						return;
					}
					if ( message ) {
						message.textContent = result.body.message || '';
						message.hidden = ! result.body.message;
					}
				} )
				.catch( function () {
					if ( captcha ) {
						resetCaptcha( captcha );
					}
					if ( message ) {
						message.textContent = form.dataset.networkError || text.network || 'Something went wrong. Please try again.';
						message.hidden = false;
					}
				} )
				.finally( function () {
					delete form.dataset.pending;
					if ( button ) {
						button.disabled = false;
					}
				} );
		} );
	}

	// Read a field's current value from the form: checkbox groups join with a
	// comma, radios take the checked value, everything else the input value.
	function fieldValue( form, fieldId ) {
		var inputs = form.querySelectorAll( '[name="' + fieldId + '"]' );
		if ( ! inputs.length ) {
			return '';
		}
		var first = inputs[ 0 ];
		if ( first.type === 'checkbox' ) {
			var picked = [];
			inputs.forEach( function ( input ) {
				if ( input.checked ) {
					picked.push( input.value );
				}
			} );
			return picked.join( ', ' );
		}
		if ( first.type === 'radio' ) {
			var value = '';
			inputs.forEach( function ( input ) {
				if ( input.checked ) {
					value = input.value;
				}
			} );
			return value;
		}
		return first.value;
	}

	function conditionPasses( operator, actual, expected ) {
		var a = String( actual );
		var b = String( expected );
		switch ( operator ) {
			case 'equals':
				return a === b;
			case 'not_equals':
				return a !== b;
			case 'contains':
				return b !== '' && a.toLowerCase().indexOf( b.toLowerCase() ) !== -1;
			case 'not_empty':
				return a.trim() !== '';
			case 'is_empty':
				return a.trim() === '';
			default:
				return true;
		}
	}

	// Field show/hide logic (the single Free rule). A hidden-by-logic field is
	// display:none and its inputs are disabled so they never submit.
	function wireLogic( form ) {
		var rules = [];
		form.querySelectorAll( '.flexa-formflow-field[data-ff-logic]' ).forEach( function ( wrap ) {
			var logic;
			try {
				logic = JSON.parse( wrap.getAttribute( 'data-ff-logic' ) );
			} catch ( e ) {
				return;
			}
			if ( logic && logic.field && logic.operator ) {
				rules.push( { wrap: wrap, logic: logic } );
			}
		} );
		if ( ! rules.length ) {
			return;
		}

		function evaluate() {
			rules.forEach( function ( rule ) {
				var passes = conditionPasses( rule.logic.operator, fieldValue( form, rule.logic.field ), rule.logic.value );
				var visible = rule.logic.action === 'hide' ? ! passes : passes;
				rule.wrap.style.display = visible ? '' : 'none';
				rule.wrap.querySelectorAll( 'input, select, textarea' ).forEach( function ( input ) {
					input.disabled = ! visible;
				} );
			} );
		}

		form.addEventListener( 'input', evaluate );
		form.addEventListener( 'change', evaluate );
		evaluate();
	}

	function init() {
		document.querySelectorAll( '.flexa-formflow-form' ).forEach( function ( form ) {
			wire( form );
			wireLogic( form );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
