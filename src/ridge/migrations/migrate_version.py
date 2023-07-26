from ridge.utils.yaml import load_config_from_file, save_config_to_file


def migrate_config_to_version(args):
    raw_config = load_config_from_file(args.config_file)

    # Add version to ridge config schema
    if "version" not in raw_config:
        raw_config["version"] = args.version_no
        save_config_to_file(raw_config, args.config_file)

        # regenerate ridge index on first start of this version
        # this should refresh index and apply index corruption fixes from #325
        args.regenerate = True

    return args
