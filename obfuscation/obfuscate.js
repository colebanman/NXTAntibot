const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const parser = require('@babel/parser');
const generate = require('@babel/generator').default;
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

const JavaScriptObfuscator = require('javascript-obfuscator');

const publicKey = "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAjoNVncIVsUAuW4RH75cYe6I3T7sHC54OmIU+eTYc/F1SDSCGtirBym4rgtGwwHLFhGaq6sLoI9BxbAwmoVMliWiBrRmatXhmPbqX7juRvLHPJ+9LHJp/eEQgSz7aef/zVrjzCpz0xD0Nh2o4Lg+ckXXgMBWID8btmwJwjLVHNj9J1hsEs0fk/iGmK1hCEYqX3Vosxue0sxLKzvyNDsNKdEL5NXpLSlHB2RWVa0+EFcieuLfVmMThe9NqUY5w9Zf3AYHvVpQuam2TJd0ht6jx MozpWrVwHVlHna+goRDBBV9mxzRBTxlwDgtgbZCO4YBmF2AbxSBnhnhtFboniHHtih19DeXQKsS5ZiOZr9/bcVNgvIfzvNuw/lrMTZCgz3i5XNQKBtQKPceohBxCA4Hg UEE6J5hgxjneJMlZRCc9XKFeTgFxmfuN1B+vSx9s+f7F4Wl9ri+8GawApznyJn8XzVHMrMZbTHcS1FVe\/\/nU/n0/nY1Qfs3XnQN4xhScHjnuvh8/fOvbNEWXplZOrj+JYTsjDb9Vs9basXTqYz284GNRrAwBIEOnXyu4fGOxiKv0ipCPs/RRxVVadA8tB0ReyZysEQ5PQ0Jhsf0jRZk/rrctMq/YqzyxG9aOGeM7vB/Pbgo88c/OUiZfaFP7T/vqdINs82/wC2/To4Y/ZFQ5BwsCAwEAAQ=="

function generateRandomName() {
    // return random hex string like _0x38a2db
    return '_' + Math.random().toString(16).substr(2, 8);
}

function packString(str) {
    const charCodes = str.split('').map(c => c.charCodeAt(0));
    return t.arrayExpression(charCodes.map(code => t.numericLiteral(code)));
}


function obfuscateControlFlow(code) {
    const ast = parser.parse(code, { sourceType: "module" });

    traverse(ast, {
        WhileStatement(path) {
            let whileStmt = path.node;
            let parentBody = path.parent.body;
            let bodyBlock = whileStmt.body;
            let bodyParts = bodyBlock.body;
            if (bodyParts.length == 0) return;
            if (!t.isSwitchStatement(bodyParts[0])) return;
            let switchStmt = bodyParts[0];
            let switchCases = switchStmt.cases;

            let basicBlocksByCase = {};

            for (let switchCase of switchCases) {
                let key = switchCase.test.value;
                basicBlocksByCase[key] = switchCase.consequent;
            }

            let arrayName = switchStmt.discriminant.object.name;
            let parentScope = path.parentPath.scope;
            let binding = parentScope.getBinding(arrayName);

            let arrayExpr = binding.path.node.init;
            let order = arrayExpr.elements.map((stringLiteral) => stringLiteral.value)

            let stuffInOrder = [];

            for (let caseNum of order) {
                let basicBlock = basicBlocksByCase[caseNum];
                stuffInOrder.push(...basicBlock);
            }

            path.replaceWithMultiple(stuffInOrder);
            binding.path.remove();
        },
        ContinueStatement(path) {
            path.remove();
        }
    });

    return generate(ast, {}).code;

    
}
function obfuscateVariableNames(code) {
    const ast = parser.parse(code, { sourceType: "module" });
    const renamedVariables = new Map();

    traverse(ast, {
        // Handle variable declarations
        VariableDeclarator(path) {
            const originalName = path.node.id.name;
            // Check if the variable name has not been renamed in the current scope
            if (!path.scope.hasBinding(renamedVariables.get(originalName))) {
                // Generate a new name and store it
                const newName = generateRandomName();
                renamedVariables.set(originalName, newName);
                path.scope.rename(originalName, newName);
            }
        },
        FunctionDeclaration(path) {
            // Rename the function name if it has not been renamed in the current scope
            const originalName = path.node.id.name;
            if (!path.scope.hasBinding(renamedVariables.get(originalName))) {
                const newName = generateRandomName();
                renamedVariables.set(originalName, newName);
                path.scope.rename(originalName, newName);
            }
        },
        FunctionExpression(path) {
            // Rename the function name if it has not been renamed in the current scope
            if (path.node.id && !path.scope.hasBinding(renamedVariables.get(path.node.id.name))) {
                const newName = generateRandomName();
                renamedVariables.set(path.node.id.name, newName);
                path.scope.rename(path.node.id.name, newName);
            }
        },
    });

    return generate(ast, {}).code;
}

function hideFunctionCalls(code) {
    const ast = parser.parse(code, { sourceType: "module" });

    traverse(ast, {
        CallExpression(path) {
            if (path.node.callee.type === 'MemberExpression' &&
                path.node.callee.object.type === 'Identifier' &&
                path.node.callee.property.type === 'Identifier') {

                // Split the object and property into arrays of characters
                const objectChars = path.node.callee.object.name.split('').map(char => t.stringLiteral(char));
                const propertyChars = path.node.callee.property.name.split('').map(char => t.stringLiteral(char));

                // Create arrays from these characters
                const objectArray = t.arrayExpression(objectChars);
                const propertyArray = t.arrayExpression(propertyChars);

                // Join the arrays to form the original names
                const joinedObject = t.callExpression(
                    t.memberExpression(objectArray, t.identifier('join')),
                    [t.stringLiteral('')]
                );
                const joinedProperty = t.callExpression(
                    t.memberExpression(propertyArray, t.identifier('join')),
                    [t.stringLiteral('')]
                );

                // Construct the new callee using eval for the object and direct property access
                const reconstructedCallee = t.memberExpression(
                    t.callExpression(t.identifier('eval'), [joinedObject]),
                    t.stringLiteral(path.node.callee.property.name),
                    true // Indicates that this is a computed property
                );

                path.node.callee = reconstructedCallee;
            }
        }
    });

    return generate(ast, {}).code;
}

function createProxyFunctions(code) {
    const ast = parser.parse(code, { sourceType: "module" });

    traverse(ast, {
        // Target only original function declarations
        FunctionDeclaration(path) {
            if (path.node._isProxy || path.node.id.name.startsWith('_proxy_')) {
                // Skip proxy functions
                return;
            }

            const originalFunctionName = path.node.id.name;
            const newFunctionName = '_proxy_' + originalFunctionName;

            // Create parameters for the proxy function
            const params = path.node.params.map(param => t.cloneNode(param));

            // Create a call expression to the original function
            const callExpr = t.callExpression(t.identifier(originalFunctionName), params);

            // Create the proxy function
            const proxyFunction = t.functionDeclaration(
                t.identifier(newFunctionName),
                params,
                t.blockStatement([t.returnStatement(callExpr)])
            );
            proxyFunction._isProxy = true;  // Mark the proxy function to avoid processing it again

            // Insert the proxy function before the original function
            path.insertBefore(proxyFunction);

            // Rename the original function
            path.scope.rename(originalFunctionName, '_original_' + originalFunctionName);
        }
    });

    return generate(ast, {}).code;
}

function addDeadCodeBranches(code) {
    const ast = parser.parse(code, { sourceType: "module" });

    traverse(ast, {
        Function(path) {
            if (path.node._deadCodeAdded) {
                return;
            }

            // Generate a random function name
            const randomFunctionName = generateRandomName();

            // Create a call to the random function
            const randomFunctionCall = t.callExpression(t.identifier(randomFunctionName), []);

            // Wrap the call in a try-catch block
            const tryBlock = t.blockStatement([t.expressionStatement(randomFunctionCall)]);
            const catchBlock = t.blockStatement([]);
            const tryCatchStatement = t.tryStatement(tryBlock, t.catchClause(t.identifier('e'), catchBlock));

            if (path.node.body.type === 'BlockStatement') {
                path.node.body.body.unshift(tryCatchStatement);
            } else {
                const returnStatement = t.returnStatement(path.node.body);
                path.node.body = t.blockStatement([tryCatchStatement, returnStatement]);
            }

            path.node._deadCodeAdded = true;
        }
    });

    return generate(ast, {}).code;
}

function obfuscateStringsAndCalls(code) {
    const ast = parser.parse(code, { sourceType: "module" });


    function unpackStringExpression(arrayExpr) {
        const joinExpr = t.callExpression(
            t.memberExpression(arrayExpr, t.identifier('map')),
            [t.arrowFunctionExpression(
                [t.identifier('c')],
                t.callExpression(t.identifier('String.fromCharCode'), [t.identifier('c')])
            )]
        );
        return t.callExpression(
            t.memberExpression(joinExpr, t.identifier('join')),
            [t.stringLiteral('')]
        );
    }
    

    function shouldObfuscate(node) {
        const objectsToObfuscate = ['console', 'window', 'document', 'navigator', 'screen', 'history', 'performance', 'WebSocket', 'prototype', 'send', 'call']
        return node.type === 'MemberExpression' &&
               node.object.type === 'Identifier' &&
               objectsToObfuscate.includes(node.object.name);
    }
    function packAndEvalConstructor(constructorName, arguments) {
        // Pack the constructor name
        const packedConstructor = packString(constructorName);
        // Unpack the constructor name
        const unpackedConstructor = unpackStringExpression(packedConstructor);

        // Convert arguments to array expressions
        const argumentExpressions = arguments.map(arg => {
            if (t.isStringLiteral(arg)) {
                return unpackStringExpression(packString(arg.value));
            }
            return arg;
        });

        // Use eval to call the constructor with arguments
        return t.newExpression(
            t.callExpression(t.identifier('eval'), [unpackedConstructor]),
            argumentExpressions
        );
    }

    const calles = [
        "WebSocket",
        "Uint8Array",
    ]

    function isWebSocketConstructor(path, callee) {
        return path.node.callee.type === 'Identifier' &&
               path.node.callee.name === callee &&
               path.node.arguments.length > 0;
    }

    
    function isWebSocketSend(path) {
        return path.node.callee.type === 'MemberExpression' &&
               path.node.callee.property.type === 'Identifier' &&
               path.node.callee.property.name === 'send'
    }

    traverse(ast, {
        CallExpression(path) {
            // Obfuscate WebSocket.send calls
            if (isWebSocketSend(path)) {
                console.log('Found WebSocket.send call')
                
                const callExprStr = generate(path.node, { code: true }).code;
                const packedCallExpr = packString(callExprStr);
                const unpackedCallExpr = unpackStringExpression(packedCallExpr);

                path.replaceWith(
                    t.callExpression(
                        t.identifier('eval'),
                        [unpackedCallExpr]
                    )
                );

            }
            // Obfuscate calls to methods of window, document, etc.
            else if (shouldObfuscate(path.node.callee)) {
                const callExprStr = generate(path.node, { code: true }).code;
                const packedCallExpr = packString(callExprStr);
                const unpackedCallExpr = unpackStringExpression(packedCallExpr);

                path.replaceWith(
                    t.callExpression(
                        t.identifier('eval'),
                        [unpackedCallExpr]
                    )
                );
            }
        },
        NewExpression(path) {
            for (const callee of calles) {
                if (isWebSocketConstructor(path, callee)) {
                    path.replaceWith(packAndEvalConstructor(callee, path.node.arguments));
                }
            }
        },
        MemberExpression(path) {
            if (t.isAssignmentExpression(path.parent) && path.node.property.name === 'textBaseline' && t.isMemberExpression(path.node) && t.isIdentifier(path.node.object)) {
                const assignmentExprStr = generate(path.parent, { code: true }).code;
                const packedAssignmentExpr = packString(assignmentExprStr);
                const unpackedAssignmentExpr = unpackStringExpression(packedAssignmentExpr);
    
                path.parentPath.replaceWith(
                    t.callExpression(
                        t.identifier('eval'),
                        [unpackedAssignmentExpr]
                    )
                );
            }
            
            // Obfuscate property accesses on window, document, etc.
            if (shouldObfuscate(path.node) && !t.isAssignmentExpression(path.parent)) {
                const memberExprStr = generate(path.node, { code: true }).code;
                const packedMemberExpr = packString(memberExprStr);
                const unpackedMemberExpr = unpackStringExpression(packedMemberExpr);

                path.replaceWith(
                    t.callExpression(
                        t.identifier('eval'),
                        [unpackedMemberExpr]
                    )
                );
            }
        },
        StringLiteral(path) {
            // Skip transformation if the string literal is part of an import declaration
            if (path.findParent((parent) => parent.isImportDeclaration())) {
                return;
            }
        
            if (!path.parentPath.isObjectProperty({ key: path.node })) {
                // make sure temp vars like {{}} isn't in the string
            
                if(!path.node.value.includes('{{')){
                    if (path.node.value) {
                        path.replaceWith(unpackStringExpression(packString(path.node.value)));
                    }
                }
                else{
                    console.log(`Skipping ${path.node.value}`);
                }
            }
        }
    });

    return generate(ast, {}).code;
}


function obfuscateConstantVariables(code) {
    try{
        var ast = parser.parse(code, { sourceType: "module" });
    }
    catch(e){
        console.log(e);
        return code;
    }
    const newNodes = [];

    traverse(ast, {
        VariableDeclaration(path) {
            if (path.node.kind === 'const') {
                path.node.declarations.forEach(declaration => {
                    if (declaration.init) {
                        const originalName = declaration.id.name;
                        if(originalName == undefined){
                            return;
                        }
                        const obfuscatedName = generateRandomName();
                        const originalValue = declaration.init;

                        // Change 'const' to 'var' and initialize with a dummy value
                        path.node.kind = 'var';
                        declaration.id = t.identifier(obfuscatedName);
                        declaration.init = t.arrayExpression([]);

                        // Prepare to assign the intended value to the var variable
                        const assignValue = t.expressionStatement(
                            t.assignmentExpression(
                                '=',
                                t.identifier(obfuscatedName),
                                originalValue
                            )
                        );

                        // Prepare the const declaration with the original value
                        const originalConst = t.variableDeclaration('const', [
                            t.variableDeclarator(
                                t.identifier(originalName),
                                t.identifier(obfuscatedName)
                            )
                        ]);


                        newNodes.push({ path: path, nodes: [assignValue, originalConst] });
                    }
                });
            }
        }
    });

    // Insert the new nodes after completing the traversal to avoid infinite loop
    newNodes.forEach(item => {
        item.path.insertAfter(item.nodes);
    });

    return generate(ast, {}).code;
}

function obfuscateObjectKeys(code) {
    const ast = parser.parse(code, { sourceType: "module" });
    const keyMappings = new Map();

    traverse(ast, {
        ObjectProperty(path) {
            // Check if the key is an Identifier (not computed)
            if (t.isIdentifier(path.node.key) && !path.node.computed) {
                const originalKey = path.node.key.name;
                const obfuscatedKey = generateRandomName();

                // Map the original key to the obfuscated key
                keyMappings.set(originalKey, obfuscatedKey);

                // Replace the key with the obfuscated key
                path.node.key = t.identifier(obfuscatedKey);

                // Create a variable declaration for the obfuscated key
                const variableDeclaration = t.variableDeclaration('var', [
                    t.variableDeclarator(
                        t.identifier(obfuscatedKey),
                        // You can use your existing string packing logic here
                        // For example, pack and eval the original key string
                        t.callExpression(
                            t.identifier('eval'),
                            [packString(originalKey)]  // Implement packString function as before
                        )
                    )
                ]);

                // Insert the variable declaration before the object expression
                path.findParent((path) => path.isProgram()).unshiftContainer('body', variableDeclaration);
            }
        }
    });

    return generate(ast, {}).code;
}

let evalFunctionName = generateRandomName();

// function to replace eval with a function call
function repaceEval(code) {
    const ast = parser.parse(code, { sourceType: "module" });

    traverse(ast, {
        CallExpression(path) {
            if (path.node.callee.type === 'Identifier' &&
                path.node.callee.name === 'eval') {
                path.node.callee.name = evalFunctionName;
            }
        }
    });

    return generate(ast, {}).code;
}
// function to create custom eval function

function createEvalFunction(code) {
    const ast = parser.parse(code, { sourceType: "module" });

    // temp just use eval for now

    const evalFunction = t.functionDeclaration(
        t.identifier(evalFunctionName),
        [t.identifier('str')],
        t.blockStatement([
            t.returnStatement(
                t.callExpression(
                    t.identifier('window["e"+"v"+"a"+"l"]'),
                    [t.identifier('str')]
                )
            )
        ])
    );

    ast.program.body.unshift(evalFunction);


    return generate(ast, {}).code;
}



function obfuscateScript(data) {

    // return data;


    data = JavaScriptObfuscator.obfuscate(data, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: true,
        domainLock: [],
        domainLockRedirectUrl: 'about:blank',
        forceTransformStrings: [],
        identifierNamesCache: null,
        identifierNamesGenerator: 'hexadecimal',
        identifiersDictionary: [],
        identifiersPrefix: '',
        ignoreImports: false,
        inputFileName: '',
        log: false,
        numbersToExpressions: false,
        optionsPreset: 'default',
        renameGlobals: true,
        renameProperties: false,
        renamePropertiesMode: 'safe',
        reservedNames: [],
        reservedStrings: [],
        seed: 0,
        selfDefending: false,
        simplify: false,
        sourceMap: false,
        sourceMapBaseUrl: '',
        sourceMapFileName: '',
        sourceMapMode: 'separate',
        sourceMapSourcesMode: 'sources-content',
        splitStrings: false,
        splitStringsChunkLength: 10,
        stringArray: false,
        stringArrayCallsTransform: false,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: [],
        stringArrayIndexesType: [
            'hexadecimal-number'
        ],
        stringArrayIndexShift: false,
        stringArrayRotate: false,
        stringArrayShuffle: false,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: false,
        stringArrayWrappersParametersMaxCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayThreshold: 0.75,
        target: 'browser',
        transformObjectKeys: false,
        unicodeEscapeSequence: false
    }).getObfuscatedCode();


    // remove all comments
    data = data.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');

    // replace all // with \/\/
    data = data.replaceAll('//', '\\/\\/');

    // Start with foundational transformations
    data = obfuscateConstantVariables(data);

    // Obfuscate object keys
    data = obfuscateObjectKeys(data); // <-- Inserted here

    // Proxy functions and control flow changes
    data = createProxyFunctions(data);

    data = obfuscateVariableNames(data);


    // // Add complexity with dead code and string/call obfuscations
    data = addDeadCodeBranches(data);
    data = obfuscateStringsAndCalls(data);

    // Finalize by hiding specific function calls
    // data = hideFunctionCalls(data);

    data = obfuscateControlFlow(data);

    


    // // Replace eval with a function call
    data = repaceEval(data);

    data = createEvalFunction(data);

    data = data.replace("{{PUBLIC_KEY}}", publicKey);

    return data;
}

async function getScript(clientIdentifier){
    let data = await new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, 'main.template.js'), 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    data = data.replaceAll('{{UUID}}', clientIdentifier);
    data = data.replaceAll('{{ST}}', Date.now());


    // return data;

    return await obfuscateScript(data);
}

module.exports = {
    getScript,
};