import os
import os.path
import sys
import json
import subprocess as sub
import tempfile

def isexec (fpath):
    if fpath == None: return False
    return os.path.isfile(fpath) and os.access(fpath, os.X_OK) 

def which(program):
    fpath, fname = os.path.split(program)
    if fpath:
        if isexec (program):
            return program
    else:
        for path in os.environ["PATH"].split(os.pathsep):
            exe_file = os.path.join(path, program)
            if isexec (exe_file):
                return exe_file
    return None

def runCSlicer(repo_path, start, end, tests, excludes, engine):
    opt = 'slicer'
    if engine == 'cslicer':
        opt = 'slicer'
        config_file = genCSlicerConfigFile(repo_path, start, end, excludes,
                                           tests)
    elif engine == 'definer':
        opt = 'refiner'
        config_file = genDefinerConfigFile(repo_path, start, end, excludes,
                                           genTestScript(tests, 'template.txt'))
    elif engine == 'combined':
        opt = 'refiner'
    else:
        opt = 'slicer'
        config_file = genCSlicerConfigFile(repo_path, start, end, excludes,
                                           tests)        
    java = which('java')
    p = sub.Popen([java,
                   '-jar',
                   # '/u/liyi/bit/gitslice/target/cslicer-1.0.0-jar-with-dependencies.jar',
                   '/Users/liyi/Documents/bit/gitref/target/cslicer-1.0.0-jar-with-dependencies.jar',
                   '-c', config_file,
                   '-e', opt,
                   '-jq'], stdout=sub.PIPE, stderr=sub.PIPE)
    p.wait()
    
    result = ''
    with open('output.log', 'w') as logfile:
        logfile.write(' '.join(sys.argv) + '\n')
        for l in p.stdout.readlines():
            logfile.write(l)
            if '[OUTPUT] RESULTS:' in l:
                result = l[18:]
        for l in p.stderr.readlines():
            logfile.write(l)

    # result = {}
    # result['simple'] = ["74afb17", "9ae4b56", "09cf373"]
    # result['hunk'] = ["09cf373"]
    # result['full'] = [["09cf373"], ["86e6c65"]]
    #result['log'] = [repo_path, start, end, tests, engine, test_script, config_file]
    # json_str = json.dumps(result)
    print result.strip()

    # cleanning up
    os.remove(config_file)
    # os.remove(test_script)
    
def genCSlicerConfigFile(repo_path, start, end, excludes, tests):
    config_file = None

    with tempfile.NamedTemporaryFile(suffix='.properties', delete=False) as configfile:
        configfile.write('repoPath=' + os.path.join(repo_path, ".git") + '\n');
        configfile.write('startCommit=' + start + '\n');
        configfile.write('endCommit=' + end + '\n');
        configfile.write('buildScriptPath=' + os.path.join(repo_path, 'pom.xml') + '\n');
        configfile.write('testScope=' + tests + '\n');
        if excludes != '':
            configfile.write('excludePaths=' + excludes + '\n');
        configfile.flush()
        config_file = configfile.name

    return config_file

def genDefinerConfigFile(repo_path, start, end, excludes, test_script):
    config_file = None
    
    with tempfile.NamedTemporaryFile(suffix='.properties', delete=False) as configfile:
        configfile.write('repoPath=' + os.path.join(repo_path, ".git") + '\n');
        configfile.write('startCommit=' + start + '\n');
        configfile.write('endCommit=' + end + '\n');
        configfile.write('buildScriptPath=' + test_script + '\n');
        if excludes != '':
            configfile.write('excludePaths=' + excludes + '\n');
        configfile.flush()
        config_file = configfile.name

    return config_file

def genTestScript(tests, template):
    test_file = None
    
    with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as testfile:
        with open(template,'r') as templatefile:
            for line in templatefile:
                line = line.replace('$cslicer_tests', "'-Dtest=" + tests + "'")
                testfile.write(line)
            testfile.flush()
        test_file = testfile.name

    return test_file

if __name__ == '__main__':
    repo_path = sys.argv[1]
    start = sys.argv[2]
    end = sys.argv[3]
    tests = sys.argv[4]
    excludes = sys.argv[5]
    engine = sys.argv[6]

    runCSlicer(repo_path, start, end, tests, excludes, engine)
