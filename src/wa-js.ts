/**
 * WhatsApp Web Integration Script
 * 
 * This script runs in the MAIN world context (same as WhatsApp Web's own scripts).
 * It has direct access to the WPP (WPPConnect) API for interacting with WhatsApp.
 * 
 * Key responsibilities:
 * - Send messages via WPPConnect API
 * - Fetch WhatsApp groups list
 * - Handle message queue
 * - Communicate with content scripts via window messaging
 * 
 * @milestone 1, 2, 3
 */

import type { Message } from './types/Message';
import asyncQueue from './utils/AsyncEventQueue';
import AsyncChromeMessageManager from './utils/AsyncChromeMessageManager';
import storageManager, { AsyncStorageManager } from './utils/AsyncStorageManager';
import { ChromeMessageTypes } from './types/ChromeMessageTypes';
import WPP from '@wppconnect/wa-js';

declare global {
    interface Window {
        WPP: typeof WPP;
    }
}

const WebpageMessageManager = new AsyncChromeMessageManager('webpage');

/**
 * Send a message with optional attachment and buttons using WPPConnect API
 */
async function sendWPPMessage({ contact, message, attachment, buttons = [] }: Message) {
    if (attachment && buttons.length > 0) {
        const response = await fetch(attachment.url.toString());
        const data = await response.blob();
        return window.WPP.chat.sendFileMessage(
            contact,
            new File([data], attachment.name, {
                type: attachment.type,
                lastModified: attachment.lastModified,
            }),
            {
                type: 'image',
                caption: message,
                createChat: true,
                waitForAck: true,
                buttons
            }
        );
    } else if (buttons.length > 0) {
        return window.WPP.chat.sendTextMessage(contact, message, {
            createChat: true,
            waitForAck: true,
            buttons
        });
    } else if (attachment) {
        const response = await fetch(attachment.url.toString());
        const data = await response.blob();
        return window.WPP.chat.sendFileMessage(
            contact,
            new File([data], attachment.name, {
                type: attachment.type,
                lastModified: attachment.lastModified,
            }),
            {
                type: 'auto-detect',
                caption: message,
                createChat: true,
                waitForAck: true
            }
        );
    } else {
        return window.WPP.chat.sendTextMessage(contact, message, {
            createChat: true,
            waitForAck: true
        });
    }
}

/**
 * Send a message to a contact
 * Handles contact validation and Brazilian phone number format
 */
async function sendMessage({ contact, hash, delay }: { contact: string, hash: number, delay?: number }) {
    if (!window.WPP.conn.isAuthenticated()) {
        const errorMsg = 'Conecte-se primeiro!';
        alert(errorMsg);
        throw new Error(errorMsg);
    }
    const { message } = await storageManager.retrieveMessage(hash);

    let findContact = await window.WPP.contact.queryExists(contact);
    if (!findContact) {
        let truncatedNumber = contact;
        if (truncatedNumber.startsWith('55') && truncatedNumber.length === 12) {
            truncatedNumber = `${truncatedNumber.substring(0, 4)}9${truncatedNumber.substring(4)}`;
        } else if (truncatedNumber.startsWith('55') && truncatedNumber.length === 13) {
            truncatedNumber = `${truncatedNumber.substring(0, 4)}${truncatedNumber.substring(5)}`;
        }
        findContact = await window.WPP.contact.queryExists(truncatedNumber);
        if (!findContact) {
            console.log('Número não encontrado!');
            return void WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: 'Número não encontrado!', attachment: message.attachment != null, contact });
        }
    }

    contact = findContact.wid.user;

    const result = await sendWPPMessage({ contact, ...message });
    return result?.sendMsgResult.then(value => {
        const result = (value as any).messageSendResult ?? value;
        if (result !== window.WPP.whatsapp.enums.SendMsgResult.OK) {
            throw new Error('Falha ao enviar a mensagem: ' + value);
        } else {
            WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 3, message: 'Mensagem enviada com sucesso!', attachment: message.attachment != null, contact: contact });
        }
    });
}

/**
 * Add a message to the sending queue
 */
async function addToQueue(message: Message) {
    try {
        const messageHash = AsyncStorageManager.calculateMessageHash(message);
        await storageManager.storeMessage(message, messageHash);
        await asyncQueue.add({ eventHandler: sendMessage, detail: { contact: message.contact, hash: messageHash, delay: message.delay } });
        return true;
    } catch (error) {
        if (error instanceof Error) {
            WebpageMessageManager.sendMessage(ChromeMessageTypes.ADD_LOG, { level: 1, message: error.message, attachment: message.attachment != null, contact: message.contact });
        }
        throw error;
    }
}

// Message handlers for communication with content scripts
WebpageMessageManager.addHandler(ChromeMessageTypes.PAUSE_QUEUE, () => {
    try {
        asyncQueue.pause();
        return true;
    } catch (error) {
        return false;
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.RESUME_QUEUE, () => {
    try {
        asyncQueue.resume();
        return true;
    } catch (error) {
        return false;
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.STOP_QUEUE, () => {
    try {
        asyncQueue.stop();
        return true;
    } catch (error) {
        return false;
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.SEND_MESSAGE, async (message) => {
    if (window.WPP.isReady) {
        return addToQueue(message);
    } else {
        return new Promise((resolve, reject) => {
            window.WPP.webpack.onReady(async () => {
                try {
                    resolve(await addToQueue(message));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }
});

WebpageMessageManager.addHandler(ChromeMessageTypes.QUEUE_STATUS, () => asyncQueue.getStatus());

/**
 * Listen for group list requests from sidebar (Milestone 1)
 * Fetches all WhatsApp groups using WPPConnect API
 */
window.addEventListener('message', async (event) => {
    if (event.source === window && event.data.type === 'GET_GROUPS_REQUEST') {
        const messageId = event.data.id;
        console.log('[wa-js] Received GET_GROUPS_REQUEST', messageId);
        
        try {
            // Check if WPP exists
            if (!window.WPP) {
                console.error('[wa-js] WPP is not available. Make sure WPPConnect is loaded.');
                window.postMessage({
                    type: 'GET_GROUPS_RESPONSE',
                    id: messageId,
                    groups: [],
                    error: 'WPPConnect is not loaded. Please refresh the page.'
                }, '*');
                return;
            }

            // Wait for WPP to be ready
            if (!window.WPP.isReady) {
                console.log('[wa-js] WPP not ready, waiting...');
                await new Promise<void>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('WPP ready timeout - WhatsApp Web may not be fully loaded'));
                    }, 15000);
                    
                    if (window.WPP && window.WPP.webpack) {
                        window.WPP.webpack.onReady(() => {
                            clearTimeout(timeout);
                            console.log('[wa-js] WPP is now ready');
                            resolve();
                        });
                    } else {
                        // Wait for WPP to be injected
                        const checkInterval = setInterval(() => {
                            if (window.WPP && window.WPP.webpack) {
                                clearInterval(checkInterval);
                                clearTimeout(timeout);
                                window.WPP.webpack.onReady(() => {
                                    console.log('[wa-js] WPP is now ready');
                                    resolve();
                                });
                            }
                        }, 100);
                        
                        setTimeout(() => {
                            clearInterval(checkInterval);
                            clearTimeout(timeout);
                            reject(new Error('WPP not found - WPPConnect may not be properly initialized'));
                        }, 15000);
                    }
                });
            }

            // Check if user is authenticated
            if (window.WPP.conn && !window.WPP.conn.isAuthenticated()) {
                console.warn('[wa-js] User is not authenticated');
                window.postMessage({
                    type: 'GET_GROUPS_RESPONSE',
                    id: messageId,
                    groups: [],
                    error: 'Please log in to WhatsApp Web first'
                }, '*');
                return;
            }

            console.log('[wa-js] WPP is ready, fetching groups...');

            // Try multiple methods to get groups
            let groupList: Array<{ id: string; name: string }> = [];
            
            // Method 1: Try window.WPP.chat.list() - primary method
            try {
                console.log('[wa-js] Trying window.WPP.chat.list()');
                const chats = await window.WPP.chat.list();
                console.log('[wa-js] Total chats retrieved:', chats.length);
                
                // Filter for groups - check multiple properties
                const groups = chats.filter((chat: any) => {
                    // Check if it's a group by various properties
                    const isGroup = chat.isGroup === true || 
                                   chat.isGroupChat === true ||
                                   (chat.id && (typeof chat.id === 'string' ? chat.id.includes('@g.us') : 
                                               (chat.id._serialized && chat.id._serialized.includes('@g.us'))));
                    
                    if (isGroup) {
                        console.log('[wa-js] Found group:', chat.name || chat.formattedTitle || chat.id);
                    }
                    return isGroup;
                });
                
                console.log('[wa-js] Groups found:', groups.length);
                
                groupList = groups.map((group: any) => {
                    const id = group.id?._serialized || 
                              (typeof group.id === 'string' ? group.id : group.id?.toString()) || 
                              '';
                    const name = group.name || 
                                group.formattedTitle || 
                                group.subject || 
                                group.pushname || 
                                'Unnamed Group';
                    return { id, name };
                }).filter((g: any) => g.id && g.id.includes('@g.us')); // Ensure valid group ID
                
                console.log('[wa-js] Processed groups:', groupList.length);
            } catch (err) {
                console.error('[wa-js] chat.list() failed:', err);
            }

            // Method 3: Try direct DOM access as last resort (if WPP API fails)
            if (groupList.length === 0) {
                try {
                    console.log('[wa-js] Trying DOM-based group detection');
                    const groupElements = document.querySelectorAll('[data-testid="cell-frame-container"]');
                    const foundGroups: Array<{ id: string; name: string }> = [];
                    
                    groupElements.forEach((el, index) => {
                        const titleEl = el.querySelector('[data-testid="cell-frame-title"]');
                        const name = titleEl?.textContent?.trim() || `Group ${index + 1}`;
                        // Try to extract group ID from data attributes or other sources
                        const groupId = `dom_group_${index}_${Date.now()}`;
                        foundGroups.push({ id: groupId, name });
                    });
                    
                    if (foundGroups.length > 0) {
                        console.log('[wa-js] Found groups via DOM:', foundGroups.length);
                        // Note: DOM method doesn't give real IDs, so this is a fallback
                        groupList = foundGroups;
                    }
                } catch (err) {
                    console.warn('[wa-js] DOM detection failed:', err);
                }
            }

            console.log('[wa-js] Total groups found:', groupList.length);

            // Send response back
            window.postMessage({
                type: 'GET_GROUPS_RESPONSE',
                id: messageId,
                groups: groupList
            }, '*');
            
        } catch (error) {
            console.error('[wa-js] Error fetching groups:', error);
            window.postMessage({
                type: 'GET_GROUPS_RESPONSE',
                id: messageId,
                groups: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            }, '*');
        }
    }
});

storageManager.clearDatabase();

WPP.webpack?.onInjected(() => {
    console.log('Wppconnect: Loader injected!');
});

WPP.webpack?.injectLoader();
