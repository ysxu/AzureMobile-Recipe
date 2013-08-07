AzureMobile-Recipe
=======================

Azure Mobile Services Recipe core module

The recipe core module extends Azure CLI (Command Line Interface) to enable recipe usage and provides function library to simplify recipe development. This module installation is REQUIRED before any recipe usage.

# Getting started

## Install it
```bash
npm install -g azuremobile-recipe
```

## Executing any Azure Mobile Services recipes
To install a recipe:
```bash
npm install -g azuremobile-<recipename>
```
To execute an installed recipe:
```bash
azure mobile recipe execute <servicename> <recipename>
```

## Listing globally installed recipes on user machine:
```bash
azure mobile recipe list
```

## Acquiring template files to get started with Azure Mobile Services recipe development:
```bash
azure mobile recipe create <newRecipename>
```