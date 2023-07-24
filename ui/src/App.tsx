import { Center, Text, Button, ScaleFade, Card, CardBody, CardFooter, Stack, Heading, ButtonGroup, useToast, AlertDialog, AlertDialogOverlay, useDisclosure, AlertDialogContent, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, Alert, AlertDescription, AlertIcon, AlertTitle, Link, Input, NumberInput, Slider, NumberDecrementStepper, NumberIncrementStepper, NumberInputField, NumberInputStepper, SliderFilledTrack, SliderThumb, SliderTrack, Checkbox, FormControl, FormLabel, Switch } from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'preact/hooks';
import './styles/index.css';

// From Feather (because feather is an awesome icon library!)

function BackArrow() {
	return <svg style={{marginRight: 8}} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-arrow-left"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
}

export function App() {
	const [screen, setScreen] = useState<string>("main");
	const [visible, setVisible] = useState(false);

	const [database, setDatabase] = useState({
		files: [],
		modNames: [],
		enabledMods: [],
		mods: []
	});

	const toast = useToast();

	if (typeof (globalThis as any).gimhook !== "undefined") {
		(globalThis as any).gimhook._onInstallStatus = (status: boolean, name: string, message: string) => {
			toast(status ? {
				title: `Successfully installed ${name}!`,
				status: "success",
				position: "top-right",
				duration: 5000
			} : {
				title: "Failed to install mod!",
				description: message,
				status: "error",
				position: "top-right",
				duration: 5000
			});
		};

		(globalThis as any).gimhook._onRemoveStatus = (status: boolean, name: string, message: string) => {
			toast(status ? {
				title: `Successfully removed ${name}!`,
				status: "success",
				position: "top-right",
				duration: 5000
			} : {
				title: `Failed to remove ${name}!`,
				description: message,
				status: "error",
				position: "top-right",
				duration: 5000
			});
		};

		(globalThis as any).gimhook._onDatabaseUpdate = (database: any) => {
			setDatabase(database);
		};
	}

	const openModSelectionDialog = typeof (globalThis as any).gimhook !== "undefined" ? (globalThis as any).gimhook._openModSelectionDialog : () => {};
	const removeMod = typeof (globalThis as any).gimhook !== "undefined" ? (globalThis as any).gimhook._removeMod : () => {};
	const enableMod = typeof (globalThis as any).gimhook !== "undefined" ? (globalThis as any).gimhook._enableMod : () => {};
	const disableMod = typeof (globalThis as any).gimhook !== "undefined" ? (globalThis as any).gimhook._disableMod : () => {};
	const setOption = typeof (globalThis as any).gimhook !== "undefined" ? (globalThis as any).gimhook._setOption : () => {};

	// Smooth screen transitions, just because it looks nice :)

	const changeScreen = (name: string) => {
		setVisible(false);

		setTimeout(() => {
			setScreen(name);
			setVisible(true);
		}, 500);
	};

	useEffect(() => {
		setTimeout(() => {
			setVisible(true);
		}, 500);
	}, []);

	// UI stuff...

	const Mod = (props: any) => {
		const { isOpen, onOpen, onClose } = useDisclosure();
		const cancelRef = useRef();

		return (
			<>
				<Center style={{marginBottom: 16}}>
					<Card minW="lg">
						<CardBody>
							{props.mod.production ? null : (<Alert status="warning"><AlertIcon /><AlertTitle>This is a development build!</AlertTitle><AlertDescription>This mod file is only meant to be used for development purposes and is not production-ready.</AlertDescription></Alert>)}

							<Stack mt="6" spacing="3">
								<Heading size="md">{props.mod.name}</Heading>
								<Text>{props.mod.description}</Text>
								<Text><b>Author</b>: {props.mod.author}</Text>
								<Text><b>Version</b>: {props.mod.version}</Text>
								<Text><b>License</b>: {props.mod.license}</Text>

								{typeof props.mod.options !== "undefined" && props.mod.options.length != 0 ? <Heading marginTop={8} marginBottom={4} size="md">Options</Heading> : null}

								{props.mod.options?.map((option: any) => {
									const components: any = {
										text: <Input onChange={(e: any) => {setOption(props.mod.name, option.name, e.target.value)}} />,
										number: (
											<NumberInput defaultValue={option.default} min={option.min} max={option.max} onChange={e => {setOption(props.mod.name, option.name, e)}}>
												<NumberInputField />
												<NumberInputStepper>
													<NumberIncrementStepper />
													<NumberDecrementStepper />
												</NumberInputStepper>
											</NumberInput>
										),
										slider: (
											<Slider defaultValue={typeof option.default === "undefined" ? 0 : option.default} min={option.min} max={option.max} onChange={e => {setOption(props.mod.name, option.name, e)}}>
												<SliderTrack>
													<SliderFilledTrack />
												</SliderTrack>
												<SliderThumb />
											</Slider>
										),
									};

									const optionElement = components[option.type];

									return option.type === "checkbox" ? (
										/* @ts-ignore */
										<Checkbox defaultChecked={option.default} onChange={e => {console.log(e.target.value === "on")}}>{option.name}</Checkbox>
									) : option.type === "switch" ? (
										<FormControl display="flex" alignItems="center">
											<FormLabel mb="0">
												{option.name}
											</FormLabel>
											<Switch defaultChecked={option.default} onChange={e => {console.log(e.target.value === "on")}} />
										</FormControl>
									) : (
										<><Text>{option.name}:</Text>{optionElement}</>
									);
								})}
							</Stack>
						</CardBody>
						<CardFooter>
							<ButtonGroup spacing="2">
								<Button onClick={() => {database.enabledMods.includes(props.mod.name as never) ? disableMod(props.mod.name) : enableMod(props.mod.name)}}>
									{database.enabledMods.includes(props.mod.name as never) ? "Disable" : "Enable"}
								</Button>
								<Button variant="solid" colorScheme="red" onClick={onOpen}>
									Remove
								</Button>
							</ButtonGroup>
						</CardFooter>
					</Card>
				</Center>

				<AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
					<AlertDialogOverlay>
						<AlertDialogContent>
							<AlertDialogHeader fontSize='lg' fontWeight='bold'>
							Remove mod
							</AlertDialogHeader>

							<AlertDialogBody>
								Are you sure you want to remove <b>{props.mod.name}</b>?
							</AlertDialogBody>

							<AlertDialogFooter>
								<Button ref={cancelRef} onClick={onClose}>
									Cancel
								</Button>

								<Button colorScheme="red" onClick={() => {removeMod(props.mod.name); onClose()}} ml={3}>
									Remove
								</Button>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialogOverlay>
				</AlertDialog>
			</>
		);
	}

	const ModsScreen = () => {
		return (
			<>
				<Button onClick={() => {changeScreen("main")}} style={{marginTop: 8, marginLeft: 8}}><BackArrow />Back</Button>

				<Center style={{marginTop: 32}}>
					<Text fontSize="64px">Mods</Text>
				</Center>

				<Center style={{marginTop: 16, marginBottom: 16}}>
					<p><b>NOTE</b>: A mod distribution system for Gimhook is coming soon, but in the meantime you can share mods on <Link href="https://discord.gg/vBHcG76KGQ" color="blue">our discord server</Link>.</p>
				</Center>

				<Center style={{marginTop: 16, marginBottom: 16}}>
					<Button onclick={openModSelectionDialog}>Install</Button>
				</Center>

				{database.mods.map((mod: any) => <Mod mod={mod} />)}
			</>
		)
	};

	const MainScreen = () => {
		return (
			<>
				<Center style={{marginTop: 32}}>
					<Text fontSize="64px" style={{fontFamily: "Gidolinya"}}>gimhook</Text>
				</Center>
	
				<Center style={{marginTop: 32}}>
					<Button onClick={() => {window.open("https://gimkit.com/join")}}>Join a game</Button>
				</Center>
	
				<Center style={{marginTop: 16}}>
					<Button onClick={() => {window.open("https://gimkit.com/me")}}>Dashboard</Button>
				</Center>
	
				<Center style={{marginTop: 16}}>
					<Button onClick={() => {changeScreen("mods")}}>Mods</Button>
				</Center>
			</>
		)
	};

	const screens: any = {
		mods: ModsScreen,
		main: MainScreen
	}

	const ScreenComponent: any = screens[screen];

	return (
		<ScaleFade in={visible} animateOpacity>
			<ScreenComponent />
		</ScaleFade>
	);
}
